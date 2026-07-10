# Should this feature use Nexus?

```text
Is the state shared beyond one small component/feature?
├─ No → Keep local/native state.
└─ Yes
   └─ Is it primarily remote request/response data?
      ├─ Yes → Prefer a query/cache library.
      └─ No
         └─ Do several event sources or contributors mutate it?
            ├─ No → A disciplined native store is probably enough.
            └─ Yes
               └─ Are instances dynamic or does disposal matter?
                  ├─ Yes → Nexus is a strong candidate.
                  └─ No
                     └─ Do invalid birth/death transitions reveal bugs?
                        ├─ Yes → Nexus is a strong candidate.
                        └─ No → Compare the authority benefit with the ceremony.
```

## Strong signals

- Realtime, optimistic UI, persistence, policy, and background work converge on
  the same state.
- Many observers should not receive mutation.
- Stores exist per tenant, community, channel, document, session, or device.
- Duplicate creation, missing update, or repeated destruction indicates a bug.
- Contributors regularly ask who is allowed to change something.
- Subscription and persistence cleanup must follow scope lifetime.

## Signals to stop

- Local component state, input fields, or a simple form.
- Static configuration.
- A straightforward request/response screen.
- Server data already owned by a query/cache library.
- A small feature with one clear writer and no dynamic lifetime.
- The proposed owner would merely become a new god object.

## Adoption threshold

Name the concrete return before adding Nexus: reduced mutation surface,
consistent ownership, asserted lifecycle, predictable scoping, easier review, or
lower contributor entropy. If none applies, keep the native solution.
