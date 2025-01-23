perf script -i flamegraph.data > flamegraph.perf
./scripts/stackcollapse-perf.pl flamegraph.perf > flamegraph.folded
./scripts/flamegraph.pl flamegraph.folded > flamegraph.svg
