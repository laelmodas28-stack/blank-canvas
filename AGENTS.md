# Architecture rules
- Marketplace pricing uses a single versioned configuration and pure tier-aware engine, shared by calculator, ideal-price simulator and finance defaults, to prevent conflicting fee formulas.
- Until shared persistence is available, marketplace rate settings and pricing snapshots are explicitly device-local and retain versioned configuration with each snapshot; never imply cross-device synchronization.
- Shipping costs are nullable and selected by the final-price tier; explicit zero is distinct from unknown so incomplete profit is not presented as confirmed.
- Real-sale reconciliation uses pure comparison/adjustment functions and retains the original input and rate snapshot when reopening references, preventing later settings from rewriting historical comparisons.