# Check if the FlameGraph repository already exists in /tmp directory
if [ ! -d "/tmp/FlameGraph" ]; then
    echo "Cloning FlameGraph repository..."
    git clone https://github.com/brendangregg/FlameGraph /tmp/FlameGraph
else
    echo "FlameGraph repository already exists."
fi

perf script -i flamegraph.data > flamegraph.perf

# Use the cloned FlameGraph scripts to generate the flamegraph
/tmp/FlameGraph/stackcollapse-perf.pl flamegraph.perf > flamegraph.folded
/tmp/FlameGraph/flamegraph.pl flamegraph.folded > flamegraph.svg