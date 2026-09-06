# Mobile Medical 3D Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first shared-link 3D medical viewer that reproduces the reference viewer's interaction modes and tools with a React/Three.js frontend and a Java Spring Boot backend.

**Architecture:** A single Git repository contains independently built `front` and `backend` applications. The React shell delegates high-frequency rendering and interaction to a framework-independent Three.js core; the Spring Boot modular monolith exposes share, manifest, plan, annotation, measurement, audit, and storage-signing APIs through Controller → Service → ServiceImpl → Mapper boundaries. PostgreSQL stores metadata and scene state, Redis supports cache/rate limits, and a configurable storage adapter targets MinIO or Alibaba OSS.

**Tech Stack:** React, TypeScript, Three.js, Vite, Zustand, TanStack Query, Vitest, Playwright; Java 17, Spring Boot 4.0.8, Spring Security, MyBatis 4.0.1, Flyway, PostgreSQL, Redis, Maven; MinIO/Alibaba OSS; Docker and Nginx.

---

## File Structure

```text
front/                              Mobile web application
  src/app/                          Application bootstrap and routing
  src/pages/share/                  Shared-link entry states
  src/features/viewer/              Viewer shell, toolbars, strips, state
  src/api/                          Generated contracts and HTTP client
  packages/rendering-core/src/      React-independent Three.js engine
  tests/e2e/                        Browser smoke tests
backend/                            Java API
  src/main/java/.../common/         Response, errors, security, request IDs
  src/main/java/.../modules/        Feature modules with layered packages
  src/main/java/.../infrastructure/ Storage, cache, persistence adapters
  src/main/resources/db/migration/  Flyway schema
  src/main/resources/mapper/        MyBatis XML
scripts/model-pipeline/             Validated model conversion CLI contract
deploy/                             Compose, Dockerfiles, Nginx
docs/api/                           OpenAPI source of truth
```

## Task 1: Root Workspace and Reproducible Configuration

**Files:**
- Create: `README.md`
- Create: `.editorconfig`
- Create: `front/.env.example`
- Create: `backend/.env.example`
- Create: `deploy/compose/.env.example`
- Create: `docs/api/openapi.yaml`

- [ ] **Step 1: Add a failing repository structure check**

Create `scripts/check-structure.ps1`:

```powershell
$required = @(
  'front/package.json',
  'backend/pom.xml',
  'docs/api/openapi.yaml',
  'deploy/compose/docker-compose.yml'
)
$missing = $required | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missing.Count -gt 0) {
  Write-Error ('Missing required paths: ' + ($missing -join ', '))
  exit 1
}
Write-Output 'Repository structure OK'
```

- [ ] **Step 2: Run the check and verify RED**

Run: `pwsh -File scripts/check-structure.ps1`

Expected: FAIL listing at least `front/package.json` and `backend/pom.xml`.

- [ ] **Step 3: Create root documentation and environment contracts**

`README.md` must document prerequisites, `front` and `backend` startup commands, Docker startup, the valid demo share URL, and the rule that secrets never enter Git.

Use these exact environment names:

```dotenv
# backend/.env.example
SPRING_PROFILES_ACTIVE=dev
DB_URL=jdbc:postgresql://localhost:5432/medical3d
DB_USERNAME=medical3d
DB_PASSWORD=medical3d_dev
REDIS_HOST=localhost
REDIS_PORT=6379
STORAGE_PROVIDER=minio
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=medical3d
STORAGE_SIGNED_URL_TTL_SECONDS=900
```

```dotenv
# front/.env.example
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

- [ ] **Step 4: Create the OpenAPI skeleton**

```yaml
openapi: 3.1.0
info:
  title: Medical 3D Shared Viewer API
  version: 1.0.0
servers:
  - url: /api/v1
paths:
  /shared-viewers/{token}/manifest:
    get:
      operationId: getSharedViewerManifest
      parameters:
        - in: path
          name: token
          required: true
          schema: { type: string, minLength: 32, maxLength: 256 }
      responses:
        '200': { description: Viewer manifest }
        '404': { description: Unknown share }
        '410': { description: Expired or revoked share }
```

- [ ] **Step 5: Commit the configuration contract**

```bash
git add README.md .editorconfig front/.env.example backend/.env.example deploy/compose/.env.example docs/api/openapi.yaml scripts/check-structure.ps1
git commit -m "chore: define project workspace contract"
```

## Task 2: Java Backend Bootstrap and Error Contract

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/com/medical3d/viewer/Medical3dApplication.java`
- Create: `backend/src/main/java/com/medical3d/viewer/common/api/ApiError.java`
- Create: `backend/src/main/java/com/medical3d/viewer/common/web/RequestIdFilter.java`
- Create: `backend/src/main/java/com/medical3d/viewer/common/exception/GlobalExceptionHandler.java`
- Create: `backend/src/main/resources/application.yml`
- Test: `backend/src/test/java/com/medical3d/viewer/ApplicationSmokeTest.java`
- Test: `backend/src/test/java/com/medical3d/viewer/common/exception/GlobalExceptionHandlerTest.java`

- [ ] **Step 1: Create Maven project metadata with pinned versions**

Set Java to 17, Spring Boot to `4.0.8`, and MyBatis Spring Boot Starter to `4.0.1`. Add Web MVC, Validation, Security, Actuator, JDBC, Flyway, PostgreSQL, Redis, MyBatis, Testcontainers, and Spring Boot Test dependencies. Do not substitute a version silently; if Maven Central cannot resolve a user-pinned version, stop and report the exact dependency resolution error.

- [ ] **Step 2: Write the failing application smoke test**

```java
package com.medical3d.viewer;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration"
})
class ApplicationSmokeTest {
    @Test void contextLoads() {}
}
```

- [ ] **Step 3: Run and verify RED**

Run: `mvn -f backend/pom.xml -Dtest=ApplicationSmokeTest test`

Expected: FAIL because `Medical3dApplication` does not exist.

- [ ] **Step 4: Add the minimal application bootstrap**

```java
package com.medical3d.viewer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Medical3dApplication {
    public static void main(String[] args) {
        SpringApplication.run(Medical3dApplication.class, args);
    }
}
```

- [ ] **Step 5: Add request IDs and the unified error response**

`ApiError` fields are `code`, `message`, `requestId`, and `details`. `RequestIdFilter` accepts a safe incoming `X-Request-ID` or generates a UUID, writes it to MDC, and returns it in the response header. `GlobalExceptionHandler` maps validation to 400, denied actions to 403, missing resources to 404, version conflicts to 409, expired shares to 410, domain validation to 422, and dependency failures to 503.

- [ ] **Step 6: Verify GREEN**

Run: `mvn -f backend/pom.xml test`

Expected: PASS with both smoke and error-contract tests.

- [ ] **Step 7: Commit**

```bash
git add backend
git commit -m "feat: bootstrap Java API and error contract"
```

## Task 3: PostgreSQL Schema and MyBatis Persistence

**Files:**
- Create: `backend/src/main/resources/db/migration/V1__viewer_schema.sql`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/result/entity/CaseResultEntity.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/result/mapper/CaseResultMapper.java`
- Create: `backend/src/main/resources/mapper/result/CaseResultMapper.xml`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/asset/entity/ModelLayerEntity.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/asset/entity/ModelAssetEntity.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/share/entity/ViewerShareEntity.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/plan/entity/ViewerPlanEntity.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/measurement/entity/MeasurementEntity.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/annotation/entity/AnnotationEntity.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/audit/entity/AuditLogEntity.java`
- Create: Mapper interfaces beside each entity under the module's `mapper/` package
- Create: `backend/src/main/resources/mapper/asset/ModelLayerMapper.xml`
- Create: `backend/src/main/resources/mapper/asset/ModelAssetMapper.xml`
- Create: `backend/src/main/resources/mapper/share/ViewerShareMapper.xml`
- Create: `backend/src/main/resources/mapper/plan/ViewerPlanMapper.xml`
- Create: `backend/src/main/resources/mapper/measurement/MeasurementMapper.xml`
- Create: `backend/src/main/resources/mapper/annotation/AnnotationMapper.xml`
- Create: `backend/src/main/resources/mapper/audit/AuditLogMapper.xml`
- Test: `backend/src/test/java/com/medical3d/viewer/modules/result/mapper/CaseResultMapperTest.java`

- [ ] **Step 1: Write a failing Testcontainers mapper test**

```java
@MybatisTest
@Testcontainers
class CaseResultMapperTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired CaseResultMapper mapper;

    @Test
    void findsPublishedResultById() {
        CaseResultEntity saved = CaseResultEntity.published(
            UUID.randomUUID(), "case-001", "肺部演示", "mm", "LPS", 1
        );
        mapper.insert(saved);
        assertThat(mapper.findPublishedById(saved.id())).isPresent();
    }
}
```

- [ ] **Step 2: Run and verify RED**

Run: `mvn -f backend/pom.xml -Dtest=CaseResultMapperTest test`

Expected: FAIL because the schema and mapper are absent.

- [ ] **Step 3: Create the schema**

Create UUID primary keys, foreign keys, `created_at`/`updated_at` timestamps, indexes on foreign keys and status fields, unique `viewer_share.token_hash`, and JSONB columns described in the design spec. Add a version integer to plans, measurements, and annotations. Use check constraints for opacity `[0,1]`, non-negative sizes, positive manifest versions, and allowed asset variants `ORIGINAL`, `CANONICAL`, `HIGH`, `MEDIUM`, `LOW`.

- [ ] **Step 4: Implement entities and mappers**

Use immutable Java records for read projections and explicit parameter objects for inserts/updates. Mapper XML must list columns explicitly; never use `SELECT *`. Plan updates use `WHERE id = #{id} AND version = #{expectedVersion}` and increment the version atomically.

- [ ] **Step 5: Verify GREEN**

Run: `mvn -f backend/pom.xml -Dtest='*MapperTest' test`

Expected: PASS against the PostgreSQL container.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db backend/src/main/resources/mapper backend/src/main/java/com/medical3d/viewer/modules backend/src/test
git commit -m "feat: add viewer persistence schema"
```

## Task 4: Configurable MinIO and OSS Storage Boundary

**Files:**
- Create: `backend/src/main/java/com/medical3d/viewer/infrastructure/storage/StorageService.java`
- Create: `backend/src/main/java/com/medical3d/viewer/infrastructure/storage/StorageProperties.java`
- Create: `backend/src/main/java/com/medical3d/viewer/infrastructure/storage/StoredObject.java`
- Create: `backend/src/main/java/com/medical3d/viewer/infrastructure/storage/minio/MinioStorageService.java`
- Create: `backend/src/main/java/com/medical3d/viewer/infrastructure/storage/oss/OssStorageService.java`
- Create: `backend/src/main/java/com/medical3d/viewer/infrastructure/storage/StorageConfiguration.java`
- Test: `backend/src/test/java/com/medical3d/viewer/infrastructure/storage/StorageConfigurationTest.java`

- [ ] **Step 1: Write failing provider-selection tests**

```java
class StorageConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withUserConfiguration(StorageConfiguration.class);

    @Test void selectsMinio() {
        runner.withPropertyValues("storage.provider=minio")
            .run(ctx -> assertThat(ctx).hasSingleBean(MinioStorageService.class));
    }

    @Test void rejectsUnknownProvider() {
        runner.withPropertyValues("storage.provider=unknown")
            .run(ctx -> assertThat(ctx).hasFailed());
    }
}
```

- [ ] **Step 2: Run and verify RED**

Run: `mvn -f backend/pom.xml -Dtest=StorageConfigurationTest test`

Expected: FAIL because the storage boundary is absent.

- [ ] **Step 3: Implement the storage boundary**

```java
public interface StorageService {
    StoredObject upload(String objectKey, InputStream content, long contentLength, String contentType);
    URI createSignedDownloadUrl(String objectKey, Duration validity);
    void delete(String objectKey);
    boolean exists(String objectKey);
}
```

Both adapters validate object keys, keep buckets private, cap signed URL validity at the configured maximum, and wrap SDK failures in `StorageUnavailableException`. No business service may import MinIO or OSS SDK types.

- [ ] **Step 4: Verify GREEN**

Run: `mvn -f backend/pom.xml -Dtest=StorageConfigurationTest test`

Expected: PASS for MinIO and OSS provider selection and unknown-provider rejection.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: add configurable object storage adapters"
```

## Task 5: Share Validation and Viewer Manifest API

**Files:**
- Create: `backend/src/main/java/com/medical3d/viewer/modules/share/controller/SharedViewerController.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/share/service/SharedViewerService.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/share/service/impl/SharedViewerServiceImpl.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/share/dto/ViewerManifestResponse.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/share/security/ShareTokenHasher.java`
- Test: `backend/src/test/java/com/medical3d/viewer/modules/share/controller/SharedViewerControllerTest.java`
- Modify: `docs/api/openapi.yaml`

- [ ] **Step 1: Write failing controller tests**

```java
@WebMvcTest(SharedViewerController.class)
class SharedViewerControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean SharedViewerService service;

    @Test void returnsManifestForValidShare() throws Exception {
        given(service.getManifest("valid-token")).willReturn(ViewerManifestFixtures.oneLung());
        mvc.perform(get("/api/v1/shared-viewers/valid-token/manifest"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.unit").value("mm"))
            .andExpect(jsonPath("$.coordinateSystem").value("LPS"))
            .andExpect(jsonPath("$.layers[0].assets.medium").isString());
    }

    @Test void returnsGoneForExpiredShare() throws Exception {
        given(service.getManifest("expired-token")).willThrow(new ShareExpiredException());
        mvc.perform(get("/api/v1/shared-viewers/expired-token/manifest"))
            .andExpect(status().isGone());
    }
}
```

- [ ] **Step 2: Run and verify RED**

Run: `mvn -f backend/pom.xml -Dtest=SharedViewerControllerTest test`

Expected: FAIL because the controller and service do not exist.

- [ ] **Step 3: Implement token validation and manifest assembly**

Hash the high-entropy URL token with SHA-256 before lookup. Reject missing, revoked, and expired shares. Load the published result, ordered layer tree, available model variants, and permissions. Generate signed URLs only for assets the share can view. Record one `VIEW_MANIFEST` audit entry without storing the raw token or signed URLs.

- [ ] **Step 4: Complete the OpenAPI schema**

Define `ViewerManifest`, `ViewerPermissions`, `ModelLayer`, `AssetVariants`, and `ApiError` schemas. Generate front-end TypeScript types during the frontend build and fail CI when generation produces a dirty diff.

- [ ] **Step 5: Verify GREEN**

Run: `mvn -f backend/pom.xml -Dtest=SharedViewerControllerTest test`

Expected: PASS for valid, unknown, revoked, and expired shares.

- [ ] **Step 6: Commit**

```bash
git add backend docs/api/openapi.yaml
git commit -m "feat: expose secure viewer manifest"
```

## Task 6: Plan, Measurement, and Annotation Persistence

**Files:**
- Create: `backend/src/main/java/com/medical3d/viewer/modules/plan/controller/ViewerPlanController.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/plan/service/ViewerPlanService.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/plan/service/impl/ViewerPlanServiceImpl.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/plan/dto/SavePlanRequest.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/measurement/dto/MeasurementEvent.java`
- Create: `backend/src/main/java/com/medical3d/viewer/modules/annotation/dto/AnnotationEvent.java`
- Test: `backend/src/test/java/com/medical3d/viewer/modules/plan/ViewerPlanServiceTest.java`
- Modify: `docs/api/openapi.yaml`

- [ ] **Step 1: Write failing optimistic-lock tests**

```java
@Test
void rejectsUpdateWhenPlanVersionChanged() {
    given(mapper.updateState(any())).willReturn(0);
    assertThatThrownBy(() -> service.update(planId, 3, validState()))
        .isInstanceOf(VersionConflictException.class);
}
```

- [ ] **Step 2: Run and verify RED**

Run: `mvn -f backend/pom.xml -Dtest=ViewerPlanServiceTest test`

Expected: FAIL because the service is absent.

- [ ] **Step 3: Implement plan and event services**

Validate share permissions on every operation. Store scene state as versioned JSONB, validate layer IDs against the current result, reject non-finite coordinates, and cap annotation text and batch event counts. Update with optimistic locking and return HTTP 409 on conflict. Persist audit records in the same transaction as successful writes.

- [ ] **Step 4: Verify GREEN**

Run: `mvn -f backend/pom.xml -Dtest='ViewerPlanServiceTest,*ControllerTest' test`

Expected: PASS for create, read, update, delete, denied permission, invalid layer, and version conflict.

- [ ] **Step 5: Commit**

```bash
git add backend docs/api/openapi.yaml
git commit -m "feat: persist viewer plans and records"
```

## Task 7: React Share Entry and Viewer Shell

**Files:**
- Create: `front/package.json`
- Create: `front/tsconfig.json`
- Create: `front/vite.config.ts`
- Create: `front/vitest.config.ts`
- Create: `front/index.html`
- Create: `front/src/main.tsx`
- Create: `front/src/app/App.tsx`
- Create: `front/src/app/router.tsx`
- Create: `front/src/pages/share/ShareViewerPage.tsx`
- Create: `front/src/pages/share/ShareErrorState.tsx`
- Create: `front/src/api/sharedViewer.ts`
- Test: `front/src/pages/share/ShareViewerPage.test.tsx`

- [ ] **Step 1: Scaffold package metadata and test environment**

Add scripts `dev`, `build`, `typecheck`, `lint`, `test`, and `test:e2e`. Configure React Testing Library with jsdom and MSW for HTTP contract tests.

- [ ] **Step 2: Write a failing share-state test**

```tsx
it('shows the expired-link state for HTTP 410', async () => {
  server.use(http.get('*/shared-viewers/:token/manifest', () =>
    HttpResponse.json({ code: 'SHARE_EXPIRED', message: '分享链接已失效' }, { status: 410 })
  ));
  render(<MemoryRouter initialEntries={['/share/expired']}><App /></MemoryRouter>);
  expect(await screen.findByText('分享链接已失效')).toBeVisible();
});
```

- [ ] **Step 3: Run and verify RED**

Run: `pnpm --dir front test -- ShareViewerPage.test.tsx`

Expected: FAIL because the route and state components are absent.

- [ ] **Step 4: Implement the share gate**

Create `/share/:token`, fetch and validate the Manifest, and render loading, 404, 410, 422, 503, retry, and ready states. Never log the route token. Replace browser history after resolving the share so analytics and downstream errors use a redacted path.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm --dir front test -- ShareViewerPage.test.tsx && pnpm --dir front typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add front
git commit -m "feat: add shared viewer entry states"
```

## Task 8: Three.js Rendering Core, Layers, and Resource Disposal

**Files:**
- Create: `front/packages/rendering-core/src/ViewerEngine.ts`
- Create: `front/packages/rendering-core/src/types.ts`
- Create: `front/packages/rendering-core/src/loaders/ManifestLoader.ts`
- Create: `front/packages/rendering-core/src/loaders/GlbLayerLoader.ts`
- Create: `front/packages/rendering-core/src/layers/LayerManager.ts`
- Create: `front/packages/rendering-core/src/resources/ResourceDisposer.ts`
- Create: `front/packages/rendering-core/src/performance/QualityManager.ts`
- Create: `front/packages/rendering-core/src/index.ts`
- Test: `front/packages/rendering-core/src/layers/LayerManager.test.ts`
- Test: `front/packages/rendering-core/src/resources/ResourceDisposer.test.ts`

- [ ] **Step 1: Write failing layer behavior tests**

```ts
it('isolates one layer and restores previous visibility', () => {
  const manager = createLayerManager(['airway', 'artery', 'vein']);
  manager.setVisible('vein', false);
  manager.isolate('artery');
  expect(manager.visibleIds()).toEqual(['artery']);
  manager.closeIsolation();
  expect(manager.visibleIds()).toEqual(['airway', 'artery']);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --dir front test -- LayerManager.test.ts`

Expected: FAIL because `LayerManager` is absent.

- [ ] **Step 3: Implement the engine boundary**

`ViewerEngine` owns renderer, scene, camera, controls, raycaster, model registry, render loop, and resize observation. Expose commands for load, select, visibility, opacity, color, isolate, move, explode, close, reset, set background, set view, auto-rotate, screenshot, and dispose. Do not expose Three.js objects to React components.

- [ ] **Step 4: Implement progressive loading and disposal**

Load visible low/medium assets first, upgrade without changing layer IDs, support `AbortController`, and mark per-layer failures. `ResourceDisposer` traverses removed layers and disposes unique geometries, materials, textures, and render targets exactly once.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm --dir front test -- LayerManager.test.ts ResourceDisposer.test.ts`

Expected: PASS, including duplicate-material disposal and restore-after-isolation cases.

- [ ] **Step 6: Commit**

```bash
git add front/packages/rendering-core
git commit -m "feat: add progressive 3d rendering core"
```

## Task 9: Command History, Tool State Machine, and Touch Interaction

**Files:**
- Create: `front/packages/rendering-core/src/commands/Command.ts`
- Create: `front/packages/rendering-core/src/commands/CommandHistory.ts`
- Create: `front/packages/rendering-core/src/interaction/TouchController.ts`
- Create: `front/packages/rendering-core/src/interaction/ObjectPicker.ts`
- Create: `front/src/features/viewer/viewer.store.ts`
- Create: `front/src/features/viewer/toolbarDefinitions.ts`
- Test: `front/packages/rendering-core/src/commands/CommandHistory.test.ts`
- Test: `front/src/features/viewer/viewer.store.test.ts`

- [ ] **Step 1: Write failing command-history and mode tests**

```ts
it('undoes and redoes a layer transform', () => {
  const history = new CommandHistory();
  const command = transformCommand(layer, fromMatrix, toMatrix);
  history.execute(command);
  history.undo();
  expect(layer.matrix.toArray()).toEqual(fromMatrix.toArray());
  history.redo();
  expect(layer.matrix.toArray()).toEqual(toMatrix.toArray());
});

it('activates only one exclusive viewer tool', () => {
  const store = createViewerStore();
  store.getState().activateTool('length');
  store.getState().activateTool('clipPlane');
  expect(store.getState().mode).toBe('clip');
  expect(store.getState().activeTool).toBe('clipPlane');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --dir front test -- CommandHistory.test.ts viewer.store.test.ts`

Expected: FAIL because command history and viewer state do not exist.

- [ ] **Step 3: Implement modes and gestures**

Support `browse`, `measure`, `annotate`, `moveLayer`, and `clip`. Browse uses one-finger orbit and two-finger zoom/pan; move-layer uses one-finger movement of the selected layer; measure and annotate pick surface points; clip manipulates the active plane. Mode transitions cancel incomplete operations and release pointer capture.

- [ ] **Step 4: Implement derived toolbars**

Create immutable definitions for default, measurement, annotation, move-layer, and clipping toolbars. UI reads definitions from `mode`; components do not contain duplicated mode-specific branching.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm --dir front test -- CommandHistory.test.ts viewer.store.test.ts`

Expected: PASS.

```bash
git add front
git commit -m "feat: add viewer commands and tool modes"
```

## Task 10: Measurement, Annotation, Clipping, and Plan Serialization

**Files:**
- Create: `front/packages/rendering-core/src/tools/LengthTool.ts`
- Create: `front/packages/rendering-core/src/tools/DiameterTool.ts`
- Create: `front/packages/rendering-core/src/tools/AngleTool.ts`
- Create: `front/packages/rendering-core/src/tools/ClosedAreaTool.ts`
- Create: `front/packages/rendering-core/src/tools/AnnotationTool.ts`
- Create: `front/packages/rendering-core/src/tools/ClipPlaneTool.ts`
- Create: `front/packages/rendering-core/src/serialization/SceneStateSerializer.ts`
- Test: `front/packages/rendering-core/src/tools/MeasurementTools.test.ts`
- Test: `front/packages/rendering-core/src/serialization/SceneStateSerializer.test.ts`

- [ ] **Step 1: Write failing geometry tests**

```ts
it('measures millimetres in model coordinates', () => {
  const result = measureLength(new Vector3(0, 0, 0), new Vector3(3, 4, 0), 'mm');
  expect(result.value).toBe(5);
  expect(result.unit).toBe('mm');
});

it('rejects a non-finite measurement point', () => {
  expect(() => measureLength(new Vector3(NaN, 0, 0), new Vector3(), 'mm'))
    .toThrow('Measurement points must be finite');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --dir front test -- MeasurementTools.test.ts SceneStateSerializer.test.ts`

Expected: FAIL because the tools and serializer are absent.

- [ ] **Step 3: Implement tools and overlays**

Use world-space points tied to layer IDs and model versions. Render lines and handles in Three.js and text in a screen-space overlay. Reproject labels each frame without causing React tree updates. Diameter operates on an explicit two-point segment in V1; closed-area requires at least three points and serializes its polygon even if volume is not calculated.

- [ ] **Step 4: Implement scene serialization**

Serialize layer visibility, opacity, color, local transforms, exploded state, camera, background, clipping planes, measurements, and annotations. Exclude renderer internals, signed URLs, access tokens, and transient hover state. Validate the serialized schema before POST/PUT.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm --dir front test -- MeasurementTools.test.ts SceneStateSerializer.test.ts`

Expected: PASS for geometry, invalid coordinates, round-trip state, and exclusion of secrets.

```bash
git add front/packages/rendering-core
git commit -m "feat: add viewer tools and plan serialization"
```

## Task 11: High-Fidelity Mobile Viewer UI

**Files:**
- Create: `front/src/features/viewer/ViewerShell.tsx`
- Create: `front/src/features/viewer/ViewerCanvas.tsx`
- Create: `front/src/features/viewer/ContextToolbar.tsx`
- Create: `front/src/features/viewer/QuickActionRail.tsx`
- Create: `front/src/features/viewer/OrientationWidget.tsx`
- Create: `front/src/features/viewer/MeasurementStrip.tsx`
- Create: `front/src/features/viewer/AnatomyGroupStrip.tsx`
- Create: `front/src/features/viewer/LayerBottomSheet.tsx`
- Create: `front/src/features/viewer/PlanDrawer.tsx`
- Create: `front/src/styles/viewer.css`
- Test: `front/src/features/viewer/ViewerShell.test.tsx`

- [ ] **Step 1: Write failing mode-layout tests**

```tsx
it('shows the reference measurement toolbar in measure mode', () => {
  render(<ViewerShell initialMode="measure" manifest={fixtureManifest} />);
  for (const label of ['新建', '撤销', '清空', '闭合', '长度', '直径', '关闭']) {
    expect(screen.getByRole('button', { name: label })).toBeVisible();
  }
  expect(screen.queryByRole('button', { name: '方案' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --dir front test -- ViewerShell.test.tsx`

Expected: FAIL because viewer UI components are absent.

- [ ] **Step 3: Implement the reference layout**

Match the confirmed structure: contextual top toolbar; full central canvas; upper-left orientation body; right action rail; measurement/record strip above the anatomy group strip; active cyan tool borders, active red move action, visibility icons, selected blue underline, and millimetre labels with high-contrast black/yellow styling. Use 44 CSS-pixel minimum touch targets and safe-area insets.

- [ ] **Step 4: Implement responsive behavior**

Keep the portrait bottom strips collapsible. In landscape, move layers and records into a right drawer while preserving the same commands and state. Prevent browser page scrolling during canvas gestures without blocking toolbar scrolling.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm --dir front test -- ViewerShell.test.tsx && pnpm --dir front build`

Expected: PASS and a production bundle without warnings treated as errors.

```bash
git add front
git commit -m "feat: reproduce mobile viewer interface"
```

## Task 12: Model Pipeline Contract and Validation

**Files:**
- Create: `scripts/model-pipeline/package.json`
- Create: `scripts/model-pipeline/src/validateInput.ts`
- Create: `scripts/model-pipeline/src/buildManifest.ts`
- Create: `scripts/model-pipeline/src/report.ts`
- Create: `scripts/model-pipeline/src/cli.ts`
- Create: `scripts/model-pipeline/schema/layer-mapping.schema.json`
- Test: `scripts/model-pipeline/src/validateInput.test.ts`
- Create: `docs/model-pipeline.md`

- [ ] **Step 1: Write failing validation tests**

```ts
it('rejects STL without an explicit unit', async () => {
  const result = await validateInput({ path: 'lung.stl', format: 'stl' });
  expect(result.errors).toContain('STL requires an explicit source unit');
});

it('rejects an OBJ archive with a traversal entry', async () => {
  const result = await validateArchive(fixture('traversal.zip'));
  expect(result.errors).toContain('Archive entry escapes extraction root');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --dir scripts/model-pipeline test`

Expected: FAIL because validators do not exist.

- [ ] **Step 3: Implement validation and manifest generation**

Accept GLB, STL, and OBJ ZIP only. Require explicit unit and coordinate system, validate archive paths and expanded size, record SHA-256, reject non-finite geometry bounds, enforce configurable file/triangle/texture limits, and require layer names or a layer-mapping file. Generate immutable object keys for original, canonical, high, medium, low, report, and thumbnail variants.

- [ ] **Step 4: Define external conversion execution**

The CLI invokes a version-pinned conversion container through an argument array, never a concatenated shell string. It records tool image digest, arguments, source/target bounds, triangle counts, and maximum sampled vertex error. A failed quality check does not publish the Manifest.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm --dir scripts/model-pipeline test`

Expected: PASS for valid GLB, STL unit rejection, OBJ dependency rejection, path traversal, size limit, and report generation.

```bash
git add scripts/model-pipeline docs/model-pipeline.md
git commit -m "feat: define safe model conversion pipeline"
```

## Task 13: Deployment, Seed Case, and End-to-End Verification

**Files:**
- Create: `deploy/docker/front.Dockerfile`
- Create: `deploy/docker/backend.Dockerfile`
- Create: `deploy/nginx/default.conf`
- Create: `deploy/compose/docker-compose.yml`
- Create: `backend/src/main/resources/db/migration/V2__demo_share.sql`
- Create: `front/playwright.config.ts`
- Create: `front/tests/e2e/shared-viewer.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing E2E tests**

```ts
test('valid share renders the viewer and first layer', async ({ page }) => {
  await page.goto('/share/demo-valid-token-00000000000000000000');
  await expect(page.getByTestId('viewer-canvas')).toBeVisible();
  await expect(page.getByText('右上叶')).toBeVisible();
  await expect(page.getByTestId('layer-right-upper-lobe')).toHaveAttribute('data-load-state', 'ready');
});

test('expired share displays the expired state', async ({ page }) => {
  await page.goto('/share/demo-expired-token-000000000000000000');
  await expect(page.getByText('分享链接已失效')).toBeVisible();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --dir front test:e2e`

Expected: FAIL because the composed environment and seed records are absent.

- [ ] **Step 3: Add deployment services**

Compose PostgreSQL, Redis, MinIO, backend, front/Nginx, and a one-shot bucket initializer. Add health checks and dependency conditions. Nginx serves the SPA, forwards `/api/` to backend, sets HTTPS-ready proxy headers, supports range requests, and applies a conservative Content Security Policy compatible with WebGL workers.

- [ ] **Step 4: Add deterministic demo data**

Seed one published result, hierarchical lung layers, low/medium/high asset metadata, one active share, one expired share, and one saved plan. Store demo model files in the local MinIO bucket through the initializer; do not place real patient data in Git.

- [ ] **Step 5: Run full verification**

Run:

```bash
mvn -f backend/pom.xml test
pnpm --dir front lint
pnpm --dir front typecheck
pnpm --dir front test
pnpm --dir front build
pnpm --dir scripts/model-pipeline test
docker compose -f deploy/compose/docker-compose.yml up -d --build
pnpm --dir front test:e2e
pwsh -File scripts/check-structure.ps1
```

Expected: all commands PASS; Compose services become healthy; valid and expired share tests pass.

- [ ] **Step 6: Inspect the viewer on real mobile viewports**

Verify Playwright projects for iPhone Safari-equivalent viewport and Android Chrome viewport. Confirm toolbar switching, one-finger orbit, two-finger zoom/pan, layer movement, measurement overlays, bottom strips, landscape drawer, and GPU disposal on navigation.

- [ ] **Step 7: Commit**

```bash
git add deploy backend/src/main/resources/db front/tests front/playwright.config.ts README.md
git commit -m "feat: deliver deployable shared 3d viewer"
```

## Final Completion Gate

Before claiming completion, run `superpowers:verification-before-completion` and capture evidence for:

- Java tests and application startup.
- Frontend lint, typecheck, unit tests, and production build.
- Model-pipeline tests.
- Docker Compose health.
- Valid and expired share E2E tests.
- Manual mobile viewport verification.
- Clean `git status --short` except explicitly documented user files.
