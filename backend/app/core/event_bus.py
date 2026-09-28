import asyncio
from typing import Callable, Dict, List, Type, Any
from pydantic import BaseModel

# Decoupling Strategy:
# The EventBus serves as the asynchronous communication backbone between different
# isolated domains (e.g., Sales -> Inventory). Instead of one module explicitly calling
# another's service layer (which creates tight coupling), modules emit DomainEvents.
# Interested domains subscribe to these events and react independently.

class DomainEvent(BaseModel):
    """Base class for all domain events."""
    pass

class SaleCreatedEvent(DomainEvent):
    sale_id: int
    lead_id: int | None
    customer_id: int
    chassis_no: str
    status: str # 'BOOKED' or 'SOLD'

class SaleTransactionCompletedEvent(DomainEvent):
    sale_id: int
    staff_id: int
    customer_id: int
    chassis_no: str
    total_amount: float
    down_payment_amount: float | None
    payment_mode: str | None
    financier_name: str | None
    remarks: str | None

class SparePurchasedEvent(DomainEvent):
    spare_id: int
    quantity: int

class SpareConsumedEvent(DomainEvent):
    spare_id: int
    quantity: int
    reference_type: str
    reference_id: int

class VehicleIntakeEvent(DomainEvent):
    chassis_no: str
    reference_id: int
    invoice_no: str

class VehicleDeliveredEvent(DomainEvent):
    chassis_no: str
    sale_id: int
    invoice_no: str

class DefectiveSpareReturnedEvent(DomainEvent):
    spare_id: int
    serial_id: int
    job_card_id: int

class WarrantyReplacementIssuedEvent(DomainEvent):
    spare_id: int
    serial_id: int
    job_card_id: int

class SparePriceUpdatedEvent(DomainEvent):
    spare_id: int
    price: float
    margin: float

class TemporarySpareCreatedEvent(DomainEvent):
    spare_code: str
    spare_name: str
    category: str | None
    remarks: str | None

# Type alias for event handlers
EventHandler = Callable[[DomainEvent], Any]

class EventBus:
    """
    An in-memory Pub/Sub Event Bus.
    Routes events to their registered subscribers asynchronously.
    """
    def __init__(self):
        self._subscribers: Dict[Type[DomainEvent], List[EventHandler]] = {}
        self._queue: asyncio.Queue = asyncio.Queue()
        self._task: asyncio.Task | None = None

    def subscribe(self, event_type: Type[DomainEvent], handler: EventHandler) -> None:
        """Subscribe a handler to a specific event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    async def publish(self, event: DomainEvent) -> None:
        """
        Publish an event to the bus. 
        Places the event in an async queue to be processed in the background,
        ensuring the publisher is not blocked by subscriber logic.
        """
        await self._queue.put(event)

    async def _process_events(self) -> None:
        """Background task to continuously process events from the queue."""
        while True:
            event = await self._queue.get()
            event_type = type(event)
            handlers = self._subscribers.get(event_type, [])
            
            # Execute handlers concurrently
            tasks = []
            for handler in handlers:
                if asyncio.iscoroutinefunction(handler):
                    tasks.append(asyncio.create_task(handler(event)))
                else:
                    # Run sync handlers in a threadpool to prevent blocking the event loop
                    tasks.append(asyncio.to_thread(handler, event))
            
            if tasks:
                # Use gather with return_exceptions=True so one failing handler 
                # doesn't crash others processing the same event.
                await asyncio.gather(*tasks, return_exceptions=True)
                
            self._queue.task_done()

    def start(self) -> None:
        """Start the event bus background processing. Should be called on app startup."""
        if self._task is None:
            self._task = asyncio.create_task(self._process_events())

    def stop(self) -> None:
        """Stop the event bus background processing. Should be called on app shutdown."""
        if self._task:
            self._task.cancel()
            self._task = None

# Global event bus instance to be used across the application
event_bus = EventBus()
