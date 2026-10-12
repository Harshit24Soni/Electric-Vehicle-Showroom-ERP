import React, { useState, useEffect } from 'react';
import { Typography, Table, Tag, Button, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { AxiosError } from 'axios';
import { spareSalesApi, SpareSaleResponse } from '../api/spareSalesApi';
import NewSpareSaleModal from '../components/NewSpareSaleModal';

const { Title } = Typography;

const SpareSalesPage: React.FC = () => {
  const [sales, setSales] = useState<SpareSaleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await spareSalesApi.getSales();
      setSales(data);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ detail?: string }>;
      message.error(axiosError.response?.data?.detail || 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleConfirmSale = async (saleId: number) => {
    try {
      await spareSalesApi.confirmSale(saleId);
      message.success('Sale confirmed and stock updated');
      fetchSales();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ detail?: string }>;
      message.error(axiosError.response?.data?.detail || 'Failed to confirm sale');
    }
  };

  const handleCancelSale = async (saleId: number) => {
    try {
      await spareSalesApi.cancelSale(saleId);
      message.success('Sale cancelled');
      fetchSales();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ detail?: string }>;
      message.error(axiosError.response?.data?.detail || 'Failed to cancel sale');
    }
  };

  const columns: ColumnsType<SpareSaleResponse> = [
    {
      title: 'Sale ID',
      dataIndex: 'sale_id',
      key: 'sale_id',
    },
    {
      title: 'Date',
      dataIndex: 'sale_date',
      key: 'sale_date',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'blue';
        if (status === 'CONFIRMED') color = 'green';
        if (status === 'CANCELLED') color = 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: SpareSaleResponse) => {
        if (record.status === 'DRAFT') {
          return (
            <div>
              <Button type="link" onClick={() => handleConfirmSale(record.sale_id)}>
                Confirm
              </Button>
              <Button type="link" danger onClick={() => handleCancelSale(record.sale_id)}>
                Cancel
              </Button>
            </div>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>Spare Parts Sales</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          New Spare Sale
        </Button>
      </div>

      <Table
        dataSource={sales}
        columns={columns}
        rowKey="sale_id"
        loading={loading}
      />

      <NewSpareSaleModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onSuccess={() => {
          setIsModalVisible(false);
          fetchSales();
        }}
      />
    </div>
  );
};

export default SpareSalesPage;
