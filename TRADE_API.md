# Trade Flow API Documentation

**Base URL:** `http://localhost:5000/api/trades`  
**Module owner:** Member 3  
**Last updated:** 2026-07-20

---

## Authentication

Every endpoint in this module requires a valid JWT token issued by the Auth module.

**Header required on all requests:**

```
Authorization: Bearer <token>
```

Obtain a token by calling `POST /api/auth/login` or `POST /api/auth/signup`.

Missing or invalid tokens return:

```json
401 { "error": "No token provided" }
401 { "error": "Invalid token" }
```

---

## Data Types

### TradeOffer object

Returned by POST `/`, PATCH `/:id`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `sender_id` | UUID | User who created the offer |
| `receiver_id` | UUID | User who owns the requested item |
| `offered_item_id` | UUID | Item the sender is offering |
| `requested_item_id` | UUID | Item the sender wants |
| `message` | string \| null | Optional message from sender |
| `status` | string | One of: `pending`, `accepted`, `declined`, `completed`, `cancelled` |
| `created_at` | ISO 8601 timestamp | |
| `updated_at` | ISO 8601 timestamp | |

### WishlistEntry object

Returned by `POST /wishlist/:itemId`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Wishlist row primary key |
| `user_id` | UUID | Owner of the wishlist entry |
| `item_id` | UUID | The wishlisted item |
| `created_at` | ISO 8601 timestamp | |

### WishlistItem object

Returned inside the array from `GET /wishlist`.  
A join of `wishlists` + `items` — includes all item columns plus two extra:

| Field | Type | Description |
|-------|------|-------------|
| `wishlist_id` | UUID | Wishlist row primary key |
| `wishlisted_at` | ISO 8601 timestamp | When the item was wishlisted |
| `id` | UUID | Item primary key |
| `owner_id` | UUID | Item owner |
| `title` | string | |
| `description` | string \| null | |
| `category` | string \| null | |
| `item_condition` | string \| null | One of: `new`, `like_new`, `good`, `fair`, `poor` |
| `estimated_value` | decimal \| null | |
| `image_urls` | string[] | Array of image URLs |
| `status` | string | One of: `available`, `pending`, `traded` |
| `created_at` | ISO 8601 timestamp | |
| `updated_at` | ISO 8601 timestamp | |

---

## Endpoints

---

### POST /api/trades

Create a new trade offer. The receiver is automatically determined from the owner of `requested_item_id`.

**Authentication:** Required

#### Request Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `offered_item_id` | UUID | ✅ | An item the sender owns and is offering |
| `requested_item_id` | UUID | ✅ | An item the sender wants (owned by another user) |
| `message` | string | ❌ | Optional message to the receiver |

```json
{
  "offered_item_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "requested_item_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "message": "Happy to trade — book is in great condition."
}
```

#### Success Response — `201 Created`

```json
{
  "success": true,
  "tradeOffer": {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "sender_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
    "receiver_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "offered_item_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "requested_item_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "message": "Happy to trade — book is in great condition.",
    "status": "pending",
    "created_at": "2026-07-20T15:30:00.000Z",
    "updated_at": "2026-07-20T15:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "offered_item_id and requested_item_id are required" }` | Missing required fields |
| `400` | `{ "error": "You cannot trade with yourself" }` | Both items are owned by the sender |
| `400` | `{ "error": "Your offered item is no longer available" }` | Offered item status is not `available` |
| `400` | `{ "error": "The requested item is no longer available" }` | Requested item status is not `available` |
| `403` | `{ "error": "You can only offer items you own" }` | Sender does not own `offered_item_id` |
| `404` | `{ "error": "Requested item not found" }` | `requested_item_id` does not exist |
| `404` | `{ "error": "Offered item not found" }` | `offered_item_id` does not exist |
| `401` | `{ "error": "No token provided" }` | Missing Authorization header |
| `401` | `{ "error": "Invalid token" }` | Expired or malformed JWT |
| `500` | `{ "error": "Server error" }` | Unexpected server or database error |

---

### GET /api/trades/mine

Retrieve all trade offers where the authenticated user is either the sender or the receiver. Results are ordered by most recent first.

**Authentication:** Required

#### Request Headers

```
Authorization: Bearer <token>
```

#### Request Body

None.

#### Success Response — `200 OK`

```json
{
  "success": true,
  "trades": [
    {
      "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
      "sender_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
      "receiver_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      "offered_item_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "requested_item_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "message": "Happy to trade — book is in great condition.",
      "status": "pending",
      "created_at": "2026-07-20T15:30:00.000Z",
      "updated_at": "2026-07-20T15:30:00.000Z"
    }
  ]
}
```

Returns an empty array `"trades": []` when the user has no trades. Never returns `404`.

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{ "error": "No token provided" }` | Missing Authorization header |
| `401` | `{ "error": "Invalid token" }` | Expired or malformed JWT |
| `500` | `{ "error": "Server error" }` | Unexpected server or database error |

---

### PATCH /api/trades/:id

Accept or decline a pending trade offer. Only the **receiver** of the trade can call this endpoint. Accepting a trade atomically marks both items as `traded` in the same database transaction.

**Authentication:** Required

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | The trade offer ID to respond to |

#### Request Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | ✅ | Must be exactly `"accepted"` or `"declined"` |

```json
{
  "status": "accepted"
}
```

```json
{
  "status": "declined"
}
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "tradeOffer": {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "sender_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
    "receiver_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "offered_item_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "requested_item_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "message": "Happy to trade — book is in great condition.",
    "status": "accepted",
    "created_at": "2026-07-20T15:30:00.000Z",
    "updated_at": "2026-07-20T16:00:00.000Z"
  }
}
```

**Side effect on `accepted`:** Both `offered_item_id` and `requested_item_id` are updated to `status = 'traded'` in the same transaction. This is not reflected in the response body but can be verified by fetching the items.

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Invalid trade id" }` | `:id` is not a valid UUID format |
| `400` | `{ "error": "Invalid status. Use 'accepted' or 'declined'" }` | `status` field is missing or has an invalid value |
| `400` | `{ "error": "This trade has already been responded to" }` | Trade status is not `pending` |
| `403` | `{ "error": "Only the receiver can respond to this trade" }` | Authenticated user is not the receiver |
| `404` | `{ "error": "Trade not found" }` | No trade exists with the given ID |
| `401` | `{ "error": "No token provided" }` | Missing Authorization header |
| `401` | `{ "error": "Invalid token" }` | Expired or malformed JWT |
| `500` | `{ "error": "Server error" }` | Unexpected server or database error |

---

### PATCH /api/trades/:id/complete

Mark an accepted trade as completed. Either the **sender** or **receiver** can call this — both are present at the physical meetup and either can confirm it happened.

**Authentication:** Required

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | The trade offer ID to mark as completed |

#### Request Headers

```
Authorization: Bearer <token>
```

#### Request Body

None.

#### Success Response — `200 OK`

```json
{
  "success": true,
  "tradeOffer": {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "sender_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
    "receiver_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "offered_item_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "requested_item_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "message": "Let's trade!",
    "status": "completed",
    "created_at": "2026-07-20T15:30:00.000Z",
    "updated_at": "2026-07-20T17:00:00.000Z"
  }
}
```

**Side effect:** The other participant receives a `trade_completed` notification.

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Invalid trade id" }` | `:id` is not a valid UUID format |
| `400` | `{ "error": "Only an accepted trade can be marked as completed" }` | Trade status is not `accepted` |
| `403` | `{ "error": "You are not part of this trade" }` | Authenticated user is neither sender nor receiver |
| `404` | `{ "error": "Trade not found" }` | No trade exists with the given ID |
| `401` | `{ "error": "No token provided" }` | Missing Authorization header |
| `401` | `{ "error": "Invalid token" }` | Expired or malformed JWT |
| `500` | `{ "error": "Server error" }` | Unexpected server or database error |

---

### POST /api/trades/wishlist/:itemId

Add an item to the authenticated user's wishlist. This endpoint is **idempotent** — adding the same item twice returns `200` instead of an error.

**Authentication:** Required

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `itemId` | UUID | The item to add to the wishlist |

#### Request Headers

```
Authorization: Bearer <token>
```

#### Request Body

None.

#### Success Response — `201 Created` (new entry)

```json
{
  "success": true,
  "wishlistEntry": {
    "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "user_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
    "item_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "created_at": "2026-07-20T15:45:00.000Z"
  }
}
```

#### Success Response — `200 OK` (item already wishlisted)

```json
{
  "success": true,
  "message": "Item already in wishlist"
}
```

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Invalid item id" }` | `:itemId` is not a valid UUID format |
| `404` | `{ "error": "Item not found" }` | No item exists with the given ID |
| `401` | `{ "error": "No token provided" }` | Missing Authorization header |
| `401` | `{ "error": "Invalid token" }` | Expired or malformed JWT |
| `500` | `{ "error": "Server error" }` | Unexpected server or database error |

---

### GET /api/trades/wishlist

Retrieve all items in the authenticated user's wishlist. Returns a joined result of `wishlists` and `items` tables, ordered by most recently wishlisted first.

**Authentication:** Required

#### Request Headers

```
Authorization: Bearer <token>
```

#### Request Body

None.

#### Success Response — `200 OK`

```json
{
  "success": true,
  "wishlist": [
    {
      "wishlist_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "wishlisted_at": "2026-07-20T15:45:00.000Z",
      "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "owner_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      "title": "Wireless Headphones",
      "description": "Sony WH-1000XM4, barely used",
      "category": "Electronics",
      "item_condition": "like_new",
      "estimated_value": "45.00",
      "image_urls": ["https://example.com/img1.jpg"],
      "status": "available",
      "created_at": "2026-07-19T10:00:00.000Z",
      "updated_at": "2026-07-19T10:00:00.000Z"
    }
  ]
}
```

Returns an empty array `"wishlist": []` when the user has no wishlisted items. Never returns `404`.

#### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{ "error": "No token provided" }` | Missing Authorization header |
| `401` | `{ "error": "Invalid token" }` | Expired or malformed JWT |
| `500` | `{ "error": "Server error" }` | Unexpected server or database error |

---

## Complete Request Flow Example

The sequence below shows a full trade from creation to acceptance.

### 1. Alice logs in and gets a token

```
POST /api/auth/login
{ "email": "alice@test.com", "password": "password123" }
→ { "token": "<TOKEN_A>", "user": { "id": "<ALICE_ID>", ... } }
```

### 2. Bob logs in and gets a token

```
POST /api/auth/login
{ "email": "bob@test.com", "password": "password123" }
→ { "token": "<TOKEN_B>", "user": { "id": "<BOB_ID>", ... } }
```

### 3. Alice wishlists Bob's item

```
POST /api/trades/wishlist/<BOB_ITEM_ID>
Authorization: Bearer <TOKEN_A>
→ 201 { "success": true, "wishlistEntry": { ... } }
```

### 4. Alice views her wishlist

```
GET /api/trades/wishlist
Authorization: Bearer <TOKEN_A>
→ 200 { "success": true, "wishlist": [ { "title": "Wireless Headphones", ... } ] }
```

### 5. Alice sends a trade offer to Bob

```
POST /api/trades
Authorization: Bearer <TOKEN_A>
{
  "offered_item_id": "<ALICE_ITEM_ID>",
  "requested_item_id": "<BOB_ITEM_ID>",
  "message": "Let's trade!"
}
→ 201 { "success": true, "tradeOffer": { "id": "<TRADE_ID>", "status": "pending", ... } }
```

### 6. Bob checks his incoming trades

```
GET /api/trades/mine
Authorization: Bearer <TOKEN_B>
→ 200 { "success": true, "trades": [ { "status": "pending", ... } ] }
```

### 7. Bob accepts the trade

```
PATCH /api/trades/<TRADE_ID>
Authorization: Bearer <TOKEN_B>
{ "status": "accepted" }
→ 200 { "success": true, "tradeOffer": { "status": "accepted", ... } }
```

Both items are now `status: "traded"` in the database.
Alice receives a `trade_accepted` notification.

### 8. Alice and Bob meet up — either marks the trade complete

```
PATCH /api/trades/<TRADE_ID>/complete
Authorization: Bearer <TOKEN_A>   (or TOKEN_B — either works)
→ 200 { "success": true, "tradeOffer": { "status": "completed", ... } }
```

The other participant receives a `trade_completed` notification.
Member 4's `Chat.jsx` "Mark Trade Complete" button calls this endpoint.

---

## Notes

- All IDs are UUIDs (v4). Passing a non-UUID string to any `:id` or `:itemId` param returns `400` immediately without hitting the database.
- `PATCH /:id` is protected by an atomic database transaction. If the server fails between updating the trade status and updating the items, the entire operation is rolled back.
- `POST /wishlist/:itemId` is safe to call multiple times for the same item — duplicate entries are silently ignored and return `200`.
- The `sender` cannot respond to their own trade offer — only the `receiver` can call `PATCH /:id`.
- Trades can only be created against items with `status = 'available'`. Offers against `pending` or `traded` items are rejected with `400`.
- Notifications are sent fire-and-forget after every successful DB operation. A notification failure never causes the trade operation itself to fail.

---

## Known Missing Endpoints

### DELETE /api/trades/wishlist/:itemId

**Status:** Not yet implemented.

The Remove button in `Wishlist.jsx` is intentionally disabled (`disabled` attribute, `cursor: not-allowed`, `title="Coming soon"`) until this endpoint exists.

**To implement:**

Backend (`server/routes/trades.js`):
```js
router.delete('/wishlist/:itemId', requireAuth, async (req, res) => {
  const { itemId } = req.params;
  if (!isValidUUID(itemId)) {
    return res.status(400).json({ error: 'Invalid item id' });
  }
  await db.query(
    'DELETE FROM wishlists WHERE user_id = $1 AND item_id = $2',
    [req.userId, itemId]
  );
  res.json({ success: true });
});
```

Frontend (`tradeService.js`) — add:
```js
export async function removeWishlist(itemId) {
  const res = await api.delete(`/trades/wishlist/${itemId}`);
  return res.data;
}
```

Frontend (`Wishlist.jsx`) — set `REMOVE_ENDPOINT_READY = true` and wire `removeWishlist` into `handleRemove`.
