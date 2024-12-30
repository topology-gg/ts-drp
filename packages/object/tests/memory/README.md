# Memory benchmark

`memory-benchmark.sh` aims to provide a way of measuring the memory footprint of the DRP.

Usage:

```bash
./memory-benchmark.sh <number of tests per size> <output file for the results>
```

The script can be run on Linux, Windows (with WSL) and MacOS. The caveat for MacOS is that you need to install `gnu-time` with `brew install gnu-time` and then add the following line to your `.bashrc` or `.zshrc`:

```bash
export PATH="/opt/homebrew/opt/gnu-time/libexec/gnubin:$PATH"
```

to be able to use the `time` instead of `gtime`.
