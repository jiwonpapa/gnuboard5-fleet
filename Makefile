PYTHON ?= python3
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
export PYTHONDONTWRITEBYTECODE := 1

.NOTPARALLEL: bootstrap prepare check
.PHONY: test-connector-scripts check-connector-schema
.PHONY: certification-regressions certification-browser-evidence
.PHONY: doctor bootstrap prepare check check-batch test-versioning check-versioning test-audit test-migration-parity test-upstream test-runtime test-package test-certification runtime-prepare runtime-verify audit-runtime-prepare audit-runtime-verify active-prepare active-check active-server-check active-web-check legacy-consumer-prepare legacy-consumer-verify audit-scaffold audit-migration audit-migration-parity audit-migration-batch audit-migration-runtime audit-migration-staging audit-server-scaffold audit-server-static audit-local audit-package audit-staging upstream-sync upstream-audit upstream-verify secret-scan package-build package-smoke certification-up certification-down certification-clean certification-local-smoke staging-rehearsal staging-smoke

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

test-versioning:
	cd "$(ROOT)" && $(PYTHON) -m unittest discover -s tools/release/tests -p 'test_*.py'

check-versioning:
	cd "$(ROOT)" && $(PYTHON) tools/release/check_versioning.py

test-migration-parity:
	cd "$(ROOT)" && $(PYTHON) -m unittest discover -s tools/migration_parity/tests -p 'test_*.py'

test-upstream:
	cd "$(ROOT)" && $(PYTHON) -m unittest discover -s tools/upstream/tests -p 'test_*.py'

test-runtime:
	cd "$(ROOT)" && $(PYTHON) -m unittest discover -s tools/runtime/tests -p 'test_*.py'

test-package:
	cd "$(ROOT)" && $(PYTHON) -m unittest discover -s tools/package/tests -p 'test_*.py'

test-certification:
	cd "$(ROOT)" && $(PYTHON) -m unittest discover -s tools/certification/tests -p 'test_*.py'

certification-regressions:
	cd "$(ROOT)" && $(PYTHON) -m tools.certification.regression_runtime

certification-browser-evidence:
	test -n "$(BROWSER_CASES)"
	cd "$(ROOT)" && $(PYTHON) -m tools.certification.browser_runtime --cases "$(BROWSER_CASES)"

test-connector-scripts:
	cd "$(ROOT)" && $(PYTHON) -m unittest discover -s connectors/gnuboard5-php/scripts/tests -p 'test_*.py'

check-connector-schema:
	cd "$(ROOT)" && $(PYTHON) connectors/gnuboard5-php/scripts/extract_admin_schema.py --mode check --legacy-root .cache/composed/gnuboard5-php
	cd "$(ROOT)" && $(PYTHON) connectors/gnuboard5-php/scripts/check_generated_schema_labels.py --root connectors/gnuboard5-php/api/v1/Admin/Schema/Data/generated

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

audit-migration-parity:
	cd "$(ROOT)" && "$(PYTHON)" -m tools.migration_parity.cli --profile static

audit-migration-batch:
	@test -n "$(BATCH)" || { echo "BATCH=RNN is required" >&2; exit 2; }
	cd "$(ROOT)" && "$(PYTHON)" -m tools.migration_parity.batch_cli --batch "$(BATCH)" --profile static

check-batch:
	+$(MAKE) test-migration-parity
	+$(MAKE) audit-migration-batch BATCH="$(BATCH)"

audit-migration-runtime:
	cd "$(ROOT)" && "$(PYTHON)" -m tools.migration_parity.cli --profile runtime

audit-migration-staging:
	cd "$(ROOT)" && "$(PYTHON)" -m tools.migration_parity.cli --profile staging

audit-server-scaffold:
	cd "$(ROOT)" && command -v "$(PYTHON)" >/dev/null
	cd "$(ROOT)" && CARGO_NET_OFFLINE=true COMPOSER_DISABLE_NETWORK=1 "$(PYTHON)" tools/audit/g5audit.py --profile server_scaffold

audit-server-static:
	cd "$(ROOT)" && command -v "$(PYTHON)" >/dev/null
	cd "$(ROOT)" && CARGO_NET_OFFLINE=true COMPOSER_DISABLE_NETWORK=1 "$(PYTHON)" tools/audit/g5audit.py --profile server_static

audit-local:
	cd "$(ROOT)" && CARGO_NET_OFFLINE=true COMPOSER_DISABLE_NETWORK=1 "$(PYTHON)" tools/audit/g5audit.py --profile local

audit-package:
	cd "$(ROOT)" && CARGO_NET_OFFLINE=true COMPOSER_DISABLE_NETWORK=1 "$(PYTHON)" tools/audit/g5audit.py --profile package

audit-staging:
	cd "$(ROOT)" && CARGO_NET_OFFLINE=true COMPOSER_DISABLE_NETWORK=1 "$(PYTHON)" tools/audit/g5audit.py --profile staging

check:
	+$(MAKE) doctor
	+$(MAKE) test-versioning
	+$(MAKE) check-versioning
	+$(MAKE) test-audit
	+$(MAKE) test-migration-parity
	+$(MAKE) test-upstream
	+$(MAKE) test-runtime
	+$(MAKE) test-package
	+$(MAKE) test-certification
	+$(MAKE) test-connector-scripts
	+$(MAKE) runtime-verify
	+$(MAKE) check-connector-schema
	+$(MAKE) audit-runtime-verify
	+$(MAKE) active-check
	+$(MAKE) audit-server-static
	+$(MAKE) audit-migration-parity

secret-scan:
	@cd "$(ROOT)" && command -v gitleaks >/dev/null
	cd "$(ROOT)" && gitleaks git . --redact=100 --log-opts=--all

upstream-sync:
	cd "$(ROOT)" && $(PYTHON) tools/upstream/sync_gnuboard.py

upstream-audit:
	cd "$(ROOT)" && $(PYTHON) tools/upstream/sync_gnuboard.py

upstream-verify:
	cd "$(ROOT)" && $(PYTHON) tools/upstream/sync_gnuboard.py --verify-only

package-build:
	cd "$(ROOT)" && tools/package/build_release.sh "$(VERSION)"

package-smoke:
	cd "$(ROOT)" && tools/package/package_smoke.sh

certification-up:
	cd "$(ROOT)" && tools/certification/local_stack.sh up

certification-down:
	cd "$(ROOT)" && tools/certification/local_stack.sh down

certification-clean:
	cd "$(ROOT)" && tools/certification/local_stack.sh clean

certification-local-smoke:
	cd "$(ROOT)" && $(PYTHON) tools/certification/local_runtime_smoke.py

staging-rehearsal:
	cd "$(ROOT)" && tools/certification/staging_rehearsal.sh \
		"$(PROVIDER_ID)" "$(VERSION)" "$(ENV_FILE)" "$(RELEASE_MANIFEST)" "$(OUTPUT_DIR)"

staging-smoke:
	cd "$(ROOT)" && $(PYTHON) tools/certification/staging_smoke.py --config "$(CONFIG)"
