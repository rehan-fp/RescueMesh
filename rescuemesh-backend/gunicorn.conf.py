import os
import threading

bind = f"0.0.0.0:{os.getenv('PORT', '5001')}"
# A single worker keeps SOS replay detection and incident numbering serialised; threads handle concurrent HTTP requests and real-time SSE streams.
workers = 1
threads = 32
timeout = 120
accesslog = "-"
errorlog = "-"


def post_worker_init(worker):
    from ai.model_service import get_model_service

    threading.Thread(
        target=get_model_service().warm_up, name="tabpfn-warmup", daemon=True
    ).start()
