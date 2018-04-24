# Usage: python3 sample.py filename num_of_samples

import random
from os import path
from sys import argv


FILENAME = argv[1] if len(argv) > 1 else "docs_16_comma.csv"
N = int(argv[2]) if len(argv) > 2 else 1000

random.seed(42)
with open(FILENAME) as f_in:
	lines = f_in.readlines()
	s = random.sample(range(1, len(lines)), N)

name, ext = path.splitext(FILENAME)
with open("{}_{}{}".format(name, str(N), ext), "w") as f_out:
	f_out.write(lines[0])
	# Note: lines already end with "\n"
	f_out.write("".join(lines[i] for i in s))
