# ── Frontend targets ─────────────────────────────────────────────────────────
FRONT_PORT := 3000

.PHONY: studio front-start front-stop

# Start frontend in background using Python's built-in HTTP server
front-start:
	@mkdir -p logs .pids
	@if [ -f .pids/frontend.pid ] && kill -0 $$(cat .pids/frontend.pid) 2>/dev/null; then \
	  echo "  frontend already running (PID $$(cat .pids/frontend.pid))"; \
	else \
	  python3 -m http.server $(FRONT_PORT) --directory front >> logs/frontend.log 2>&1 & \
	  echo $$! > .pids/frontend.pid; \
	  echo "  frontend started (PID $$(cat .pids/frontend.pid)) → http://localhost:$(FRONT_PORT)"; \
	fi

# Stop frontend
front-stop:
	@if [ -f .pids/frontend.pid ]; then \
	  PID=$$(cat .pids/frontend.pid); \
	  if kill -0 $$PID 2>/dev/null; then \
	    kill $$PID && echo "  frontend stopped (PID $$PID)"; \
	  fi; \
	  rm -f .pids/frontend.pid; \
	else \
	  echo "  frontend not running"; \
	fi

# Run frontend in foreground (for debugging)
studio:
	python3 -m http.server $(FRONT_PORT) --directory front
