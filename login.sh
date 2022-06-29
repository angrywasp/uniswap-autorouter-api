#!/bin/bash
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source ${dir}/credentials

reset

ssh -i ${SSH_KEY} ${USER}@${SERVER}