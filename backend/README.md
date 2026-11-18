# StepCode Backend - Scholar AI Engine

For comprehensive project documentation, architecture, and running instructions, please refer to the [Root README](../README.md).

### Quick Commands:
```bash
# Activate environment
source ../.venv/bin/activate

# Run database seeder
PYTHONPATH=. python seed_data.py

# Run tests
pytest -v tests

# Run server
uvicorn app.main:app --reload
```
