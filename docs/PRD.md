# Product Requirements Document (PRD)

## Secure File Storage Service

---

## 1. Project Overview & Scope

A secure, scalable web application where authenticated users can upload, manage, and share files. The system handles large uploads (>= 100 MB), validates inputs against OWASP guidelines, and enforces granular access control (Public vs Private files).

---

## 2. Technical Architecture & Stack

- **Framework**: Next.js 14+ (App Router, Server Actions, Route Handlers, TypeScript)
- **UI & Styling**: Tailwind CSS, Lucide React, Shadcn/Radix UI patterns
- **Database**: PostgreSQL with Prisma ORM
- **Object Storage**: S3-Compatible Storage (AWS S3 / MinIO Local via `@aws-sdk/client-s3` & `@aws-sdk/s3-request-presigner`)
- **HTTP Client**: Axios (used in browser for progress reporting & cancelation via `AbortController`)
- **Validation**: Zod (shared schemas across client & API boundaries)
- **Authentication**: JWT / Session stored in HttpOnly, Secure, SameSite Cookies with Argon2/Bcrypt password hashing

---

## 3. Database Schema (Prisma Data Model)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

enum FileVisibility {
  PRIVATE
  PUBLIC
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String?
  role         Role     @default(USER)
  storageLimit BigInt   @default(1073741824) // 1 GB in bytes
  usedStorage  BigInt   @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  files        File[]
}

model File {
  id           String         @id @default(uuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  originalName String
  storageKey   String         @unique
  mimeType     String
  size         BigInt
  visibility   FileVisibility @default(PRIVATE)
  shareToken   String?        @unique @default(uuid())
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([userId])
  @@index([shareToken])
}

```

---

## 4. System Flow & API Specifications

### 4.1. Direct-to-Storage Upload Flow (>= 100 MB)

1. **Pre-flight Check**: Client requests a Presigned URL from Backend by passing file metadata.
2. **Quota & Extension Validation**: Backend verifies user quota and MIME type whitelist, then signs an S3 `PutObjectCommand` (valid for 15 minutes).
3. **Direct Upload**: Browser uploads binary directly to Object Storage via `Axios.put(presignedUrl)` with `onUploadProgress`.
4. **Metadata Commit**: Client sends confirmation to backend to create the database record and update `user.usedStorage`.

```
[Browser] --- (1) POST /api/files/presigned-url ---> [Next.js API]
[Browser] <--- (2) Presigned PUT URL + Key ---------- [Next.js API]
[Browser] --- (3) PUT File Binary (w/ Progress) ----> [MinIO / S3 Storage]
[Browser] --- (4) POST /api/files/complete ---------> [Next.js API] -> [PostgreSQL]

```

### 4.2. API Endpoints Contract

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Login and issue HttpOnly cookie | No |
| `POST` | `/api/auth/logout` | Clear auth cookies | Yes |
| `GET` | `/api/files` | List personal files (query: search, sort, filter) | Yes |
| `POST` | `/api/files/presigned-url` | Generate temporary S3 upload URL | Yes |
| `POST` | `/api/files/complete` | Save metadata after upload completion | Yes |
| `GET` | `/api/files/:id/download` | Generate download presigned GET URL (Private) | Yes (Owner) |
| `PATCH` | `/api/files/:id/visibility` | Toggle `PRIVATE` / `PUBLIC` | Yes (Owner) |
| `DELETE` | `/api/files/:id` | Delete file from storage and database | Yes (Owner) |
| `GET` | `/api/share/:token` | Retrieve public file metadata & download link | No |

---

## 5. Security & OWASP File Handling Compliance

- **Storage Key Obfuscation**: Storage path format is `uploads/${userId}/${uuidv4()}-${sanitizedFilename}`. Prevents directory traversal and object overwriting.
- **XSS Mitigation**: On download, enforce headers:
- `Content-Disposition: attachment; filename="<original_name>"`
- `X-Content-Type-Options: nosniff`

- **IDOR Protection**: All mutating and private access queries must enforce `WHERE id = :fileId AND userId = :currentUserId`.
- **Public Link Guessability**: Public file routing uses high-entropy random UUID tokens (`shareToken`), never exposed database auto-increment IDs.
- **Payload Limits**: Max single upload threshold is 500 MB (minimum assignment requirement >= 100 MB satisfied).

---

## 6. Frontend Functional Requirements

- **Auth Views**: Clean login and registration forms with client-side Zod validation.
- **Dashboard View**:
- File table with columns: Name, Size, MIME type, Visibility, Date Uploaded, Actions.
- Search input, type filter, and quota utilization progress bar (`usedStorage` / `storageLimit`).

- **Upload Modal**:
- Drag-and-drop zone.
- Active upload queue showing filename, file size, real-time percentage progress, and a **Cancel** button (triggers `AbortController.abort()`).

- **Share Modal**:
- One-click copyable share link for public files (`/share/{shareToken}`).
- Instant visibility toggle switch (`Public` <-> `Private`).

---

## 7. Standard Error Response Schema

All backend API routes must respond with consistent error structures:

```json
{
  "success": false,
  "error": {
    "code": "STORAGE_LIMIT_EXCEEDED",
    "message": "User storage quota is insufficient for this upload."
  }
}

```

---

## 8. Development & Implementation Roadmap

```
Phase 1: Environment & Core Setup
  ├── docker-compose.yml (PostgreSQL + MinIO)
  ├── Prisma configuration and database migration
  └── MinIO bucket initialization & S3 SDK client helper

Phase 2: Authentication & Authorization
  ├── User registration & password hashing (Argon2 / Bcrypt)
  ├── JWT issuance via HttpOnly cookies
  └── Route middleware for protected paths

Phase 3: Core Storage & File APIs
  ├── Presigned PUT URL generator route
  ├── Metadata persistence & quota tracking route
  ├── Download presigned GET URL & public token access route
  └── File deletion (S3 object removal + DB record purge)

Phase 4: Frontend Dashboard & Upload Engine
  ├── Dashboard layout, statistics, & file table
  ├── Drag-and-drop uploader component
  ├── Axios progress bar integration & cancellation hook
  └── Visibility toggle & public share link UI

Phase 5: Validation & Hardening
  ├── File type & size limit validation
  ├── OWASP headers enforcement on download triggers
  └── End-to-end testing with files >= 100 MB

```

```

```
