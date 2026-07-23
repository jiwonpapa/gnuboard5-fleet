MODE ?= dev
BUILD_MODE := $(strip $(if $(filter $(MODE),product production),prod,$(MODE)))
SERVICE_COVERAGE_MIN ?= 80
OUTPUT_DIR ?= dist
PACKAGE_VERSION ?=
DEPLOY_ARGS ?=

.PHONY: help build runtime-metadata quality package deploy-staging dev prod product clean-build

help:
	@echo "make build MODE=dev|prod"
	@echo "make package MODE=prod [PACKAGE_VERSION=...]"
	@echo "make deploy-staging MODE=prod [DEPLOY_ARGS='--dry-run']"
	@echo "make deploy-staging MODE=prod [DEPLOY_ARGS='--no-delete --skip-permission-fix']"

runtime-metadata:
	@php ./scripts/write_build_metadata.php "$(BUILD_MODE)"

quality:
	@SERVICE_COVERAGE_MIN="$(SERVICE_COVERAGE_MIN)" ./scripts/run_quality_gates.sh

build: runtime-metadata quality

package:
	@$(MAKE) build MODE="$(BUILD_MODE)" SERVICE_COVERAGE_MIN="$(SERVICE_COVERAGE_MIN)"
	@SKIP_BUILD=1 BUILD_MODE="$(BUILD_MODE)" OUTPUT_DIR="$(OUTPUT_DIR)" PACKAGE_VERSION="$(PACKAGE_VERSION)" ./scripts/build_release_package.sh

deploy-staging:
	@$(MAKE) build MODE="$(BUILD_MODE)" SERVICE_COVERAGE_MIN="$(SERVICE_COVERAGE_MIN)"
	@SKIP_BUILD=1 BUILD_MODE="$(BUILD_MODE)" ./scripts/deploy_staging.sh --skip-quality $(DEPLOY_ARGS)

dev:
	@$(MAKE) build MODE=dev SERVICE_COVERAGE_MIN="$(SERVICE_COVERAGE_MIN)"

prod product:
	@$(MAKE) build MODE=prod SERVICE_COVERAGE_MIN="$(SERVICE_COVERAGE_MIN)"

clean-build:
	@rm -rf build/runtime
