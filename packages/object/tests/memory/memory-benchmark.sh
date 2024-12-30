#!/bin/bash

# This script is used to benchmark the memory footprint of the DRP

if [ ! $# -gt 1 ]; then
    echo "Usage: $0 <number of tests per size> <output file>"
    exit 1
fi

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
cd $SCRIPT_DIR

result_file=$2
printf "Size,Memory,HeapUsed\n" >$result_file

# define a drpobject
aggr_define_obj_mem=0
aggr_define_obj_heapUsed=0
for((i=0;i<$1;i++)); do
    command time -f "%M %e %x" tsx empty.ts >out 2>log
    read EMPTY_MEM TIME STATUS < log
    command time -f "%M %e %x" tsx define_obj.ts >out 2>log
    read MEM TIME STATUS <log
    aggr_define_obj_mem=$((aggr_define_obj_mem + MEM - EMPTY_MEM))
    heapUsed=$(grep "heapUsed" out | awk '{print $2}')
    # convert to kilobytes
    heapUsed=$((heapUsed / 1024))
    aggr_define_obj_heapUsed=$((aggr_define_obj_heapUsed + heapUsed))

    printf "%s,%s,%s\n" "0" $((MEM - EMPTY_MEM)) $heapUsed >> $result_file
done

# avg_define_obj_mem=$((aggr_define_obj_mem / $1))
# avg_define_obj_heapUsed=$((aggr_define_obj_heapUsed / $1))

# echo -e "Average mem usage for defining a DRP object = $avg_define_obj_mem"
# echo -e "Average heapUsed for defining a DRP object = $avg_define_obj_heapUsed"

sizes=(1000 2000 3000 4000 5000 6000 7000 8000 9000 10000)
for size in ${sizes[@]}; do
    aggr_create_ops_mem=0
    aggr_create_ops_heapUsed=0

    for((i=0;i<$1;i++)); do
        command time -f "%M %e %x" tsx empty.ts >out 2>log
        read EMPTY_MEM TIME STATUS <log

        command time -f "%M %e %x" tsx create_ops.ts $size >out 2>log
        read MEM TIME STATUS <log
        aggr_create_ops_mem=$((aggr_create_ops_mem + MEM - EMPTY_MEM))
        heapUsed=$(grep "heapUsed" out | awk '{print $2}')
        # convert to kilobytes
        heapUsed=$((heapUsed / 1024))
        aggr_create_ops_heapUsed=$((aggr_create_ops_heapUsed + heapUsed))

        printf "%s,%s,%s\n" $size $((MEM - EMPTY_MEM)) $heapUsed >> $result_file
    done

    # avg_create_ops_mem=$((aggr_create_ops_mem / $1))
    # avg_create_ops_heapUsed=$((aggr_create_ops_heapUsed / $1))

    # echo -e "Average mem usage for creating $size ops = $avg_create_ops_mem"
    # echo -e "Average heapUsed for creating $size ops = $avg_create_ops_heapUsed"
done

rm out log
