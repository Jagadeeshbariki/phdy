# Security Specification for PHDY App

## Data Invariants
1. **Join Requests**: Anyone can create a join request, but only admins can read, update, or delete them.
2. **Users**: Only admins can read, create, update, or delete the `users` collection.
3. **Members**: Anyone can read members (public gallery). Only admins can write (create/update/delete).
4. **Accounting**: Only admins and treasurers can read/write accounting records.
5. **Works**: Anyone can read works (public gallery). Only admins can write.

## The "Dirty Dozen" Payloads (Attack Vectors)
1. **Privilege Escalation**: A normal user tries to set their role to 'admin' in the `users` collection.
2. **Join Request Hijack**: An attacker tries to update someone else's join request status to 'Approved'.
3. **Unauthorized PII Read**: A non-admin user tries to list all `join_requests` (leaking emails/phones).
4. **Accounting Tamper**: A non-treasurer tries to delete an expense record.
5. **Shadow Fields**: An attacker tries to inject a `isVerified: true` field into a join request.
6. **Large Payload**: An attacker tries to send a 2MB string in the `reason` field of a join request.
7. **Identity Spoofing**: An attacker tries to create a join request with someone else's email in the payload while authenticated.
8. **Orphaned User**: An attacker tries to create a user record without a corresponding email.
9. **Status Step Skip**: A user tries to create a join request directly in 'Approved' status.
10. **Resource Poisoning**: An attacker tries to use a 500-character string as a document ID.
11. **Timeless Record**: An attacker tries to create a record without `createdAt` or using a client-side timestamp.
12. **Public User List Leak**: A non-authenticated user tries to read the `users` collection.

## Test Runner (Conceptual firestore.rules.test.ts)
- `test('unauthenticated users cannot read users collection')`
- `test('non-admins cannot approve join requests')`
- `test('users cannot change their own roles')`
- `test('treasurers can manage accounting but not users')`
- `test('anyone can read public members and works')`
