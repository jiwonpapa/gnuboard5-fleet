PYTHON ?= python3
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
export PYTHONDONTWRITEBYTECODE := 1

.NOTPARALLEL: bootstrap prepare check
.PHONY: doctor bootstrap prepare check test-audit test-upstream test-runtime runtime-prepare runtime-verify audit-runtime-prepare audit-runtime-verify active-prepare active-check active-server-check active-web-check legacy-consumer-prepare legacy-consumer-verify audit-scaffold audit-migration audit-server-scaffold upstream-sync upstream-audit upstream-verify secret-scan

doctor:
	@cd "$(ROOT)" && command -v git >/dev/null
	@cd "$(ROOT)" && command -v $(PYTHON) >/dev/null
	@cd "$(ROOT)" && command -v bash >/dev/null
	@cd "$(ROOT)" && command -v php >/dev/null
	@cd "$(ROOT)" && command -v composer >/dev/null
	@cd "$(ROOT)" && command -v rg >/dev/null
	@cd "$(ROOT)" && command -v bun >/dev/null
	@cd "$(ROOT)" && command -v cargo >/dev/null
	@cd "$(ROOT)" && command -v rustfmt >/dev/null
	@cd "$(ROOT)" && command -v node >/dev/null
	@cd "$(ROOT)" && $(PYTHON) --version
	@cd "$(ROOT)" && git --version

test-audit:
	cd "$(ROOT)" && $(PYTHON) -m unittest discover -s tools/audit/tests -p 'test_*.py'

test-upstream:
	cd "$(ROOT)" && $(PYTHON) -m unittest discover -s tools/upstream/tests -p 'test_*.py'

test-runtime:
	cd "$(ROOT)" && $(PYTHON) -m unittest discover -s tools/runtime/tests -p 'test_*.py'

runtime-prepare:
	cd "$(ROOT)" && $(PYTHON) tools/runtime/compose_gnuboard.py

runtime-verify:
	cd "$(ROOT)" && $(PYTHON) tools/runtime/compose_gnuboard.py --verify-only

audit-runtime-prepare:
	cd "$(ROOT)" && $(PYTHON) tools/runtime/prepare_consumers.py prepare-audit --python "$(PYTHON)"

audit-runtime-verify:
	cd "$(ROOT)" && $(PYTHON) tools/runtime/prepare_consumers.py verify-audit --python "$(PYTHON)"

active-prepare:
	cd "$(ROOT)" && cargo fetch --locked
	cd "$(ROOT)/apps/admin-web" && bun install --frozen-lockfile --ignore-scripts

active-server-check:
	cd "$(ROOT)" && cargo fmt --all --check
	cd "$(ROOT)" && cargo clippy --workspace --all-targets --locked --offline -- -D warnings
	cd "$(ROOT)" && cargo test --workspace --locked --offline

active-web-check:
	cd "$(ROOT)/apps/admin-web" && test -d node_modules
	cd "$(ROOT)/apps/admin-web" && bun run typecheck
	cd "$(ROOT)/apps/admin-web" && bun run lint
	cd "$(ROOT)/apps/admin-web" && bun run test
	cd "$(ROOT)/apps/admin-web" && bun run build

active-check: active-server-check active-web-check

legacy-consumer-prepare:
	cd "$(ROOT)" && $(PYTHON) tools/runtime/prepare_consumers.py prepare --python "$(PYTHON)"

legacy-consumer-verify:
	cd "$(ROOT)" && $(PYTHON) tools/runtime/prepare_consumers.py verify --python "$(PYTHON)"

bootstrap:
	+$(MAKE) upstream-sync
	+$(MAKE) prepare

prepare:
	+$(MAKE) upstream-verify
	+$(MAKE) runtime-prepare
	+$(MAKE) audit-runtime-prepare
	+$(MAKE) active-prepare

audit-scaffold:
	cd "$(ROOT)" && $(PYTHON) tools/audit/g5audit.py --profile scaffold

audit-migration:
	cd "$(ROOT)" && command -v "$(PYTHON)" >/dev/null
	cd "$(ROOT)" && CARGO_NET_OFFLINE=true COMPOSER_DISABLE_NETWORK=1 "$(PYTHON)" tools/audit/g5audit.py --profile migration_static

audit-server-scaffold:
	cd "$(ROOT)" && command -v "$(PYTHON)" >/dev/null
	cd "$(ROOT)" && CARGO_NET_OFFLINE=true COMPOSER_DISABLE_NETWORK=1 "$(PYTHON)" tools/audit/g5audit.py --profile server_scaffold

check:
	+$(MAKE) doctor
	+$(MAKE) test-audit
	+$(MAKE) test-upstream
	+$(MAKE) test-runtime
	+$(MAKE) runtime-verify
	+$(MAKE) audit-runtime-verify
	+$(MAKE) active-check
	+$(MAKE) audit-server-scaffold

secret-scan:
	@cd "$(ROOT)" && command -v gitleaks >/dev/null
	cd "$(ROOT)" && gitleaks git . --redact=100 --log-opts=--all

upstream-sync:
	cd "$(ROOT)" && $(PYTHON) tools/upstream/sync_gnuboard.py

upstream-audit:
	cd "$(ROOT)" && $(PYTHON) tools/upstream/sync_gnuboard.py

upstream-verify:
	cd "$(ROOT)" && $(PYTHON) tools/upstream/sync_gnuboard.py --verify-only
