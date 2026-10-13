import asyncio
import inspect
import logging
from typing import Any, Callable, Dict, List, Optional, Type
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------------------
# Decoupled Domain Event Definitions
# ------------------------------------------------------------------------------
class DomainEvent(BaseModel):
    """Base class for all domain events across ERP business domains."""

    pass


class SaleCreatedEvent(DomainEvent):
    sale_id: int
    lead_id: Optional[int] = None
    customer_id: int
    chassis_no: str
    status: str  # 'BOOKED' or 'SOLD'


class SaleTransactionCompletedEvent(DomainEvent):
    sale_id: int
    staff_id: int
    customer_id: int
    chassis_no: str
    total_amount: float
    down_payment_amount: Optional[float] = None
    payment_mode: Optional[str] = None
    financier_name: Optional[str] = None
    remarks: Optional[str] = None


class SaleCompletedEvent(DomainEvent):
    sale_id: int
    chassis_no: str
    customer_id: int
    invoice_no: Optional[str] = None
    total_amount: Optional[float] = None


# Alias for backward compatibility
SaleCompleted = SaleCompletedEvent


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
    category: Optional[str] = None
    remarks: Optional[str] = None


# Type alias for event handlers (can be async coroutine or sync function)
EventHandler = Callable[[DomainEvent], Any]


# ------------------------------------------------------------------------------
# Asynchronous Enterprise Event Bus
# ------------------------------------------------------------------------------
class EventBus:
    """
    Decoupled in-memory asynchronous pub/sub domain event bus.
    Dispatches events to registered listeners concurrently using asyncio.gather
    with strict exception isolation so listener failures never crash publishers.
    """

    def __init__(self):
        self._subscribers: Dict[Type[DomainEvent], List[EventHandler]] = {}
        self._queue: asyncio.Queue = asyncio.Queue()
        self._worker_task: Optional[asyncio.Task] = None
        self._is_running: bool = False

    def subscribe(self, event_type: Type[DomainEvent], handler: EventHandler) -> None:
        """Register a subscriber handler for a specific domain event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        if handler not in self._subscribers[event_type]:
            self._subscribers[event_type].append(handler)
            logger.debug(f"[EventBus] Registered handler '{handler.__name__}' for '{event_type.__name__}'")

    def unsubscribe(self, event_type: Type[DomainEvent], handler: EventHandler) -> None:
        """Remove a subscriber handler."""
        if event_type in self._subscribers and handler in self._subscribers[event_type]:
            self._subscribers[event_type].remove(handler)
            logger.debug(f"[EventBus] Unregistered handler '{handler.__name__}' from '{event_type.__name__}'")

    async def publish(self, event: DomainEvent) -> None:
        """
        Publish a domain event and dispatch to all registered listeners.
        Executes all handlers concurrently via asyncio.gather with return_exceptions=True.
        Listener failures are logged but isolated from the publishing domain logic.
        """
        event_type = type(event)
        handlers = list(self._subscribers.get(event_type, []))

        # Also notify any generic DomainEvent listeners
        if event_type is not DomainEvent and DomainEvent in self._subscribers:
            handlers.extend(self._subscribers[DomainEvent])

        if not handlers:
            logger.debug(f"[EventBus] No registered handlers for '{event_type.__name__}'.")
            return

        tasks = []
        handler_names = []
        for handler in handlers:
            handler_name = getattr(handler, "__name__", repr(handler))
            handler_names.append(handler_name)
            if inspect.iscoroutinefunction(handler):
                tasks.append(handler(event))
            else:
                # Offload synchronous blocking functions to worker threadpool
                tasks.append(asyncio.to_thread(handler, event))

        logger.info(f"[EventBus] Dispatching '{event_type.__name__}' to {len(tasks)} listener(s).")
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for name, result in zip(handler_names, results):
            if isinstance(result, Exception):
                logger.error(
                    f"[EventBus] Exception isolated in listener '{name}' handling '{event_type.__name__}': {result}",
                    exc_info=result,
                )

    async def publish_async(self, event: DomainEvent) -> None:
        """Queue event for background deferred asynchronous processing."""
        await self._queue.put(event)

    async def _queue_worker(self) -> None:
        """Background worker loop processing events from the queue."""
        logger.info("[EventBus] Background worker task started.")
        while self._is_running:
            try:
                event = await self._queue.get()
                await self.publish(event)
                self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"[EventBus] Unexpected worker error: {exc}", exc_info=True)

    def start(self) -> None:
        """Start background queue processing task if not already running."""
        if not self._is_running:
            self._is_running = True
            loop = asyncio.get_event_loop()
            if loop.is_running():
                self._worker_task = asyncio.create_task(self._queue_worker())

    def stop(self) -> None:
        """Gracefully stop background queue worker task."""
        self._is_running = False
        if self._worker_task:
            self._worker_task.cancel()
            self._worker_task = None
            logger.info("[EventBus] Background worker task stopped.")


# Global singleton instance
event_bus = EventBus()
