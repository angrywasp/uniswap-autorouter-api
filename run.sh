#!/bin/bash

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while true; do
	node ${dir}/dist
	sleep 1
done
