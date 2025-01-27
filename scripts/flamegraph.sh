if [[ "$OSTYPE" != "linux-gnu"* ]]; then
	echo "This script is only supported on Linux due to perf compatibility."
	exit 1
fi

# Check if the FlameGraph repository already exists in /tmp directory
if [ ! -d "/tmp/FlameGraph" ]; then
	read -p "FlameGraph repository does not exist. Do you want to clone it? (y/n) " clone
	if [ "$clone" != "y" ]; then
		echo "Exiting."
		exit 1
	fi
    echo "Cloning FlameGraph repository."
    git clone https://github.com/brendangregg/FlameGraph /tmp/FlameGraph
else
    echo "FlameGraph repository already exists."
fi

perf record -F 99 -a -g -o flamegraph.data -- pnpm tsx packages/object/tests/hashgraph.flamegraph.ts
perf script -i flamegraph.data > flamegraph.perf

# Use the cloned FlameGraph scripts to generate the flamegraph
/tmp/FlameGraph/stackcollapse-perf.pl flamegraph.perf > flamegraph.folded
/tmp/FlameGraph/flamegraph.pl flamegraph.folded > flamegraph.svg
