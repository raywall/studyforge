FRONT_PORT := 3000

.PHONY: start stop

start:
	@mkdir -p logs .pids .build
	@if [ -f .pids/frontend.pid ] && kill -0 $$(cat .pids/frontend.pid) 2>/dev/null; then \
		echo "[front]   already running"; \
	else \
		nohup python3 -m http.server $(FRONT_PORT) --directory app >> logs/frontend.log 2>&1 & \
		echo $$! > .pids/frontend.pid; \
		echo "[front]   ready"; \
	fi
	@echo ""
	@echo "Frontend: http://localhost:$(FRONT_PORT)"

stop:
	if [ -f .pids/frontend.pid ]; then \
		pid=$$(cat .pids/frontend.pid); \
		kill $$pid 2>/dev/null && echo "frontend stopped" || true; \
		rm -f .pids/frontend.pid; \
	fi; \
	@rm -rf .pids