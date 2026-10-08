# HTTP status codes and troubleshooting

**English** | [Português (Brasil)](../erros.md)

| Code | Meaning | Usage |
|---|---|---|
| `200` | OK | Query, update, mounting, unmounting, or move completed |
| `201` | Created | Resource created |
| `204` | No Content | Deletion or link change completed, without a response body |
| `400` | Bad Request | Invalid body, parameters, query, or attributes |
| `401` | Unauthorized | Incorrect credentials or missing, invalid, or expired token |
| `404` | Not Found | Resource or route does not exist |
| `409` | Conflict | Name, occupancy, or resource dependency conflict |
| `413` | Payload Too Large | Body exceeds the server limit |
| `415` | Unsupported Media Type | Unsupported content type |
| `500` | Internal Server Error | Internal error or database operation failure |

Errors handled by the application normally include `code`, `message`, and, when available, `details`. Some controller validations return `message` and `errors`.

## Common problems

- **The API does not start:** check `DATABASE_URL` and `JWT_SECRET` in `.env`.
- **401 error:** log in again and send `Authorization: Bearer YOUR_TOKEN`.
- **Database connection error:** check the address, port, and credentials; inside Docker, `127.0.0.1` points to the container itself.
- **409 error when mounting:** query rack occupancy and check available units.
