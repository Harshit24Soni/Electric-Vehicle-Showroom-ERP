import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, Button, Table, InputNumber, Select, message, Popconfirm, Typography } from 'antd';
import { DeleteOutlined, ScanOutlined } from '@ant-design/icons';
import { spareSalesApi, SpareSaleItemPayload } from '../api/spareSalesApi';
import { inventoryApi, StockItem, SpareMasterItem } from '../../inventory/api/inventoryApi';
import { masterApi } from '../../master/api/masterApi'; // Assuming there's a masterApi for customers
import { api } from '@/lib/api';
import ScannerModal, { TagScanResult } from '@/components/common/ScannerModal';

const { Title, Text } = Typography;

interface NewSpareSaleModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const NewSpareSaleModal: React.FC<NewSpareSaleModalProps> = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [cart, setCart] = useState<SpareSaleItemPayload[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setCart([]);
      fetchCustomers();
      fetchStock();
    }
  }, [visible]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get<any>('/master/customers');
      setCustomers(res);
    } catch (error) {
      message.error('Failed to load customers');
    }
  };

  const fetchStock = async () => {
    try {
      const res = await inventoryApi.getStock(undefined, 'MAIN');
      setStockItems(res.items);
    } catch (error) {
      message.error('Failed to load stock');
    }
  };

  const handleTagScan = (tag: TagScanResult) => {
    const stockItem = stockItems.find(i => i.spare_id === tag.spare_id);
    if (!stockItem) {
      message.error('Scanned part is not available in main stock');
      return;
    }
    if (stockItem.quantity <= 0) {
      message.warning('Item is out of stock!');
      return;
    }
    
    addToCart(stockItem);
    message.success(`Added ${tag.spare_name} to cart`);
  };

  const addToCart = (stockItem: StockItem) => {
    const existing = cart.find(c => c.spare_id === stockItem.spare_id);
    if (existing) {
      if (existing.quantity >= stockItem.quantity) {
        message.warning('Cannot add more than available stock');
        return;
      }
      setCart(cart.map(c => 
        c.spare_id === stockItem.spare_id 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        spare_id: stockItem.spare_id,
        part_code: stockItem.part_code || '',
        quantity: 1,
        unit_selling_price: stockItem.unit_cost * 1.2, // Mock 20% margin for demo
      }]);
    }
  };

  const updateCartQuantity = (spareId: number, qty: number | null) => {
    if (!qty || qty <= 0) return;
    const stockItem = stockItems.find(i => i.spare_id === spareId);
    if (stockItem && qty > stockItem.quantity) {
      message.warning('Quantity exceeds available stock');
      return;
    }
    setCart(cart.map(c => c.spare_id === spareId ? { ...c, quantity: qty } : c));
  };

  const removeFromCart = (spareId: number) => {
    setCart(cart.filter(c => c.spare_id !== spareId));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields(['customer_id']);
      if (cart.length === 0) {
        message.error('Cart is empty!');
        return;
      }

      setSubmitting(true);
      await spareSalesApi.createDraftSale({
        customer_id: values.customer_id,
        items: cart
      });
      message.success('Draft sale created successfully!');
      onSuccess();
    } catch (error: any) {
      if (error.response?.data?.detail) {
         message.error(error.response.data.detail);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.unit_selling_price), 0);

  const columns = [
    {
      title: 'Part Code',
      dataIndex: 'part_code',
      key: 'part_code',
    },
    {
      title: 'Spare Name',
      key: 'spare_name',
      render: (_: any, record: any) => {
        const item = stockItems.find(i => i.spare_id === record.spare_id);
        return item?.spare_name || 'Unknown';
      }
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_selling_price',
      key: 'unit_selling_price',
      render: (val: number, record: any) => (
        <InputNumber 
          value={val} 
          onChange={(v) => setCart(cart.map(c => c.spare_id === record.spare_id ? { ...c, unit_selling_price: v || 0 } : c))} 
          min={0} 
          step={0.01} 
        />
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (val: number, record: any) => (
        <InputNumber 
          value={val} 
          onChange={(v) => updateCartQuantity(record.spare_id, v)} 
          min={1} 
        />
      )
    },
    {
      title: 'Total',
      key: 'total',
      render: (_: any, record: any) => (record.quantity * record.unit_selling_price).toFixed(2),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeFromCart(record.spare_id)} />
      )
    }
  ];

  return (
    <>
      <Modal
        title="New Spare Sale"
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
          Create Draft Sale
        </Button>,
      ]}
    >
      <Form layout="vertical" form={form}>
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            name="customer_id"
            label="Select Customer"
            rules={[{ required: true, message: 'Please select a customer' }]}
            style={{ flex: 1 }}
          >
            <Select
              showSearch
              placeholder="Search Customer"
              optionFilterProp="children"
              options={customers.map(c => ({ value: c.customer_id, label: `${c.name} (${c.primary_phone})` }))}
            />
          </Form.Item>
          
          <Form.Item
            label="Scan Part Code"
            style={{ flex: 1 }}
          >
            <Button 
              type="dashed" 
              block 
              icon={<ScanOutlined />} 
              onClick={() => setIsScannerOpen(true)}
              style={{ height: '32px' }}
            >
              Scan Inventory Tag
            </Button>
          </Form.Item>
        </div>
        
        <Title level={5}>Cart Items</Title>
        <Table 
          dataSource={cart} 
          columns={columns} 
          rowKey="spare_id"
          pagination={false}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                <strong>Total Amount</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={2}>
                <strong>₹{totalAmount.toFixed(2)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
        
        <div style={{ marginTop: 16 }}>
           <Select
             showSearch
             placeholder="Manually add item from stock..."
             style={{ width: '100%' }}
             optionFilterProp="children"
             value={null}
             onChange={(val) => {
                const item = stockItems.find(i => i.spare_id === val);
                if (item) addToCart(item);
             }}
           >
             {stockItems.map(item => (
                <Select.Option key={item.spare_id} value={item.spare_id} disabled={item.quantity <= 0}>
                  {item.part_code} - {item.spare_name} (In Stock: {item.quantity})
                </Select.Option>
             ))}
           </Select>
        </div>
      </Form>
    </Modal>

    <ScannerModal
      isOpen={isScannerOpen}
      onClose={() => setIsScannerOpen(false)}
      onScanSuccess={handleTagScan}
      title="Scan Tag for Sale"
    />
  </>
  );
};

export default NewSpareSaleModal;
