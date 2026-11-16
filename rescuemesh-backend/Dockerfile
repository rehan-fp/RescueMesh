FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    OMP_NUM_THREADS=4 \
    MKL_NUM_THREADS=4

WORKDIR /app

# CPU-only PyTorch wheel; the default PyPI wheel pulls several GB of CUDA libraries.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.8.0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# tabpfn 0.1.x downloads its checkpoint on first use; bake it into the image so
# runtime never depends on GitHub and a missing checkpoint fails the build.
RUN python -c "from tabpfn import TabPFNClassifier; TabPFNClassifier(device='cpu', N_ensemble_configurations=1)" \
    && ls -la "$(python -c 'import tabpfn, os; print(os.path.dirname(tabpfn.__file__))')/models_diff/"

COPY . .

CMD flask --app app db upgrade && gunicorn app:app --config gunicorn.conf.py
