from yaml import load, dump
try:
    from yaml import CLoader as Loader, CDumper as Dumper
except ImportError:
    from yaml import Loader, Dumper
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--stop_time", help="stop time", default="5m")
parser.add_argument("--nodes_per_zone", help="nodes_per_zone", type=int, default=1)
parser.add_argument("-o", "--output", help="output file", type=argparse.FileType('w'), default='-')
args = parser.parse_args()

config = load(open("sample.yaml"), Loader=Loader)
config["general"]["stop_time"] = args.stop_time
# config["hosts"] = dict()
# for i, node_id in enumerate(range(3, 40, 5)):
#     config["hosts"][f"bootstrap{i + 1:02}"] = {
#         "ip_addr": f"11.0.0.{i + 1}",
#         "network_node_id": node_id,
#         "processes": [
#             {
#                 "path": "/usr/bin/node",
#                 "args": f"/home/sofia/projects/ts-drp/simulation/bootstrap.js --ip 11.0.0.{i + 1} --seed bootstrap{i + 1:02}",
#                 "environment": { "DEBUG": "libp2p:*error" },
#                 "expected_final_state": "running",
#             }
#         ]
#     }

# Total number of nodes = 8 (regions) * 5 (reliabilities)
# Regions:
# Reliabilities:
# - 

dump(config, args.output, Dumper=Dumper)
