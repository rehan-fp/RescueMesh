"""
Thread-safe Server-Sent Events (SSE) event broadcaster for RescueMesh.

Provides instantaneous real-time push from backend to active command-center dashboards
when new emergencies arrive or incident statuses change.
"""
import json
import logging
import queue
import threading
from datetime import datetime
from typing import Any, Dict, List

logger = logging.getLogger("rescuemesh.events")


class EventBroadcaster:
    """Thread-safe Pub/Sub event broadcaster for SSE clients."""

    def __init__(self, max_subscribers: int = 256):
        self._lock = threading.Lock()
        self._subscribers: List[queue.Queue] = []
        self._max_subscribers = max_subscribers

    def subscribe(self) -> queue.Queue:
        """Register a new SSE client subscriber queue."""
        q = queue.Queue(maxsize=100)
        with self._lock:
            if len(self._subscribers) >= self._max_subscribers:
                # Evict oldest subscriber to prevent unbounded growth
                oldest = self._subscribers.pop(0)
                try:
                    oldest.put_nowait(None)
                except Exception:
                    pass
            self._subscribers.append(q)
            count = len(self._subscribers)
        logger.info("SSE client connected (active subscribers: %d)", count)
        return q

    def unsubscribe(self, q: queue.Queue) -> None:
        """Unregister an SSE client subscriber queue."""
        with self._lock:
            if q in self._subscribers:
                self._subscribers.remove(q)
            count = len(self._subscribers)
        logger.info("SSE client disconnected (active subscribers: %d)", count)

    def publish(self, event_type: str, data: Dict[str, Any]) -> int:
        """
        Broadcast an event to all connected dashboard subscribers.
        Returns the number of subscribers that received the message.
        """
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        raw_message = f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"

        delivered = 0
        with self._lock:
            dead_queues = []
            for q in list(self._subscribers):
                try:
                    q.put_nowait(raw_message)
                    delivered += 1
                except queue.Full:
                    logger.warning("Subscriber queue full, marking for eviction")
                    dead_queues.append(q)
                except Exception as exc:
                    logger.warning("Error publishing to subscriber queue: %s", exc)
                    dead_queues.append(q)

            for dead in dead_queues:
                if dead in self._subscribers:
                    self._subscribers.remove(dead)

        logger.debug("Broadcast %s to %d active subscribers", event_type, delivered)
        return delivered


# Singleton instance shared across the Gunicorn worker
broadcaster = EventBroadcaster()


def broadcast_incident_created(incident) -> None:
    """Publish an incident.created event for genuinely new emergencies."""
    try:
        data = {
            "incident_id": incident.id,
            "category": incident.category,
            "priority": incident.operational_priority,
            "ai_recommended_priority": incident.ai_recommended_priority,
            "status": incident.status,
            "location_name": incident.location_name,
            "locality": incident.locality,
            "district": incident.district,
            "latitude": incident.latitude,
            "longitude": incident.longitude,
            "display_latitude": getattr(incident, "display_latitude", None),
            "display_longitude": getattr(incident, "display_longitude", None),
            "location_source": getattr(incident, "location_source", None),
            "risk_zone": incident.risk_zone,
            "nearby_sos_count": incident.nearby_sos_count,
            "received_at": (
                incident.received_at.strftime("%Y-%m-%dT%H:%M:%SZ")
                if incident.received_at
                else None
            ),
            "sequence_number": incident.sequence_number,
            "ingestion_source": getattr(incident, "ingestion_source", "HARDWARE") or "HARDWARE",
            "incident": incident.to_dict(),
        }
        broadcaster.publish("incident.created", data)
    except Exception as exc:
        logger.exception("Failed to broadcast incident.created for %s: %s", incident.id, exc)


def broadcast_incident_updated(incident, action: str = "status_update") -> None:
    """Publish an incident.updated event when status, priority, or team changes."""
    try:
        data = {
            "incident_id": incident.id,
            "action": action,
            "status": incident.status,
            "priority": incident.operational_priority,
            "assigned_team_id": incident.assigned_team_id,
            "assigned_team_name": (
                incident.assigned_team.name if incident.assigned_team else None
            ),
            "is_overridden": incident.is_overridden,
            "ingestion_source": getattr(incident, "ingestion_source", "HARDWARE") or "HARDWARE",
            "incident": incident.to_dict(),
        }
        broadcaster.publish("incident.updated", data)
    except Exception as exc:
        logger.exception("Failed to broadcast incident.updated for %s: %s", incident.id, exc)
