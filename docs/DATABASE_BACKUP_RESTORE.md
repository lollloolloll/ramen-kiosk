# 데이터베이스 백업 및 복원 가이드 (SQLite on Docker)

이 가이드는 개발 지식이 없는 사용자도 `ramen-kiosk` 애플리케이션의 SQLite 데이터베이스(`local.db`)를 백업하고 필요할 때 복원할 수 있도록 돕기 위해 작성되었습니다. 데이터베이스는 Docker 볼륨에 저장되므로, 볼륨의 내용을 백업하고 복원하는 방식으로 진행됩니다.

## ⚠️ 중요 사항

*   **데이터 손실 주의:** 백업 및 복원 과정에서 데이터가 손실될 수 있으므로, 항상 신중하게 진행하고 중요한 데이터는 여러 번 백업하는 것을 권장합니다.
*   **서비스 중단:** 백업 및 복원 과정 중에는 `ramen-kiosk` 애플리케이션이 일시적으로 중단됩니다.
*   **백업 파일 관리:** 백업 파일은 안전한 곳에 보관하고, 어떤 백업 파일이 언제 생성되었는지 명확하게 기록해두세요.

---

## 1. 현재 Docker 볼륨 이름 확인

먼저 `ramen-kiosk` 프로젝트에서 사용 중인 Docker 볼륨의 정확한 이름을 확인해야 합니다.

```bash
docker volume ls
```

이 명령어를 실행하면 다음과 유사한 목록이 출력됩니다.
```
DRIVER    VOLUME NAME
local     ramen-kiosk_app-data
local     ramen-kiosk_uploads-data
```
여기서 `ramen-kiosk_app-data`가 데이터베이스 파일(`local.db`)이 저장되는 볼륨입니다. 이 이름을 기억해두세요. (이 가이드에서는 `ramen-kiosk_app-data`를 사용합니다.)

---

## 2. 데이터베이스 백업하기

데이터베이스를 백업하려면 다음 단계를 따르세요.

### 단계 2.1: `ramen-kiosk` 서비스 중지

데이터 일관성을 위해 백업 전에 애플리케이션 서비스를 중지해야 합니다.

```bash
docker-compose down
```
이 명령은 `ramen-kiosk` 애플리케이션과 관련된 모든 Docker 컨테이너를 중지하고 제거합니다.

### 단계 2.2: 백업 디렉토리 생성

백업 파일을 저장할 로컬 디렉토리를 생성합니다. 예를 들어, 프로젝트 루트에 `backups` 디렉토리를 만들고 그 안에 현재 날짜와 시간을 포함한 서브 디렉토리를 만드는 것이 좋습니다.

```bash
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
```
이 명령은 `backups/20251114_213000`와 같은 디렉토리를 생성합니다.

### 단계 2.3: 데이터베이스 파일 백업

Docker 볼륨에서 `local.db` 파일을 새로 생성한 백업 디렉토리로 복사합니다.

```bash
docker run --rm -v ramen-kiosk_app-data:/data -v $(pwd)/backups/$(date +%Y%m%d_%H%M%S):/backup alpine ash -c "cp /data/local.db /backup/local.db"
```
*   `docker run --rm`: 일회성 컨테이너를 실행하고 작업 완료 후 자동으로 제거합니다.
*   `-v ramen-kiosk_app-data:/data`: `ramen-kiosk_app-data` 볼륨을 컨테이너 내부의 `/data` 경로에 마운트합니다.
*   `-v $(pwd)/backups/$(date +%Y%m%d_%H%M%S):/backup`: 현재 로컬 백업 디렉토리를 컨테이너 내부의 `/backup` 경로에 마운트합니다.
*   `alpine ash -c "cp /data/local.db /backup/local.db"`: `alpine` 이미지를 사용하여 `local.db` 파일을 `/data`에서 `/backup`으로 복사합니다.

### 단계 2.4: `ramen-kiosk` 서비스 다시 시작

백업이 완료되면 애플리케이션 서비스를 다시 시작합니다.

```bash
docker-compose up -d
```
이제 데이터베이스 백업이 완료되었습니다. `backups` 디렉토리에 `local.db` 파일이 생성되었는지 확인하세요.

---

## 3. 데이터베이스 복원하기 (롤백)

이전에 백업해 둔 데이터베이스 파일로 복원하려면 다음 단계를 따르세요.

### 단계 3.1: `ramen-kiosk` 서비스 중지

복원 전에 애플리케이션 서비스를 중지해야 합니다.

```bash
docker-compose down
```

### 단계 3.2: 복원할 백업 파일 선택

`backups` 디렉토리에서 복원하고 싶은 시점의 백업 파일을 선택합니다. 예를 들어, `backups/20251114_213000/local.db` 파일을 복원한다고 가정합니다.

### 단계 3.3: 현재 데이터베이스 볼륨 초기화 (선택 사항이지만 권장)

현재 `ramen-kiosk_app-data` 볼륨의 내용을 완전히 삭제하여 깨끗한 상태에서 복원하는 것을 권장합니다. **이 작업은 현재 데이터를 영구적으로 삭제하므로 신중하게 진행하세요.**

```bash
docker volume rm ramen-kiosk_app-data
```
이 명령을 실행한 후, `docker-compose up -d`를 실행하면 Docker가 자동으로 `ramen-kiosk_app-data` 볼륨을 다시 생성합니다.

### 단계 3.4: 백업 파일로 데이터베이스 복원

선택한 백업 파일을 `ramen-kiosk_app-data` 볼륨으로 복사합니다.

```bash
# 예시: backups/20251114_213000/local.db 파일을 복원하는 경우
docker run --rm -v ramen-kiosk_app-data:/data -v $(pwd)/backups/20251114_213000:/backup alpine ash -c "cp /backup/local.db /data/local.db"
```
*   `-v $(pwd)/backups/20251114_213000:/backup`: 복원할 백업 파일이 있는 로컬 디렉토리를 컨테이너 내부의 `/backup` 경로에 마운트합니다.
*   `cp /backup/local.db /data/local.db`: 백업 파일을 `/backup`에서 `/data`로 복사하여 볼륨에 덮어씁니다.

### 단계 3.5: `ramen-kiosk` 서비스 다시 시작

복원이 완료되면 애플리케이션 서비스를 다시 시작합니다.

```bash
docker-compose up -d
```
이제 선택한 시점의 데이터베이스 상태로 애플리케이션이 복원되었습니다.

---

## 4. 추가 팁

*   **정기적인 백업:** 중요한 변경 사항이 있거나 정기적으로 데이터를 백업하여 데이터 손실 위험을 줄이세요.
*   **백업 파일 이름:** 백업 디렉토리 이름에 날짜와 시간을 포함하는 것 외에도, 백업 시점의 중요한 이벤트(예: "업데이트_전", "새로운_기능_배포_후")를 추가하여 관리하면 더욱 좋습니다.
*   **자동화:** 이 과정을 스크립트로 만들어 자동화하면 더욱 편리하게 백업 및 복원을 수행할 수 있습니다. (이 가이드에서는 다루지 않습니다.)
