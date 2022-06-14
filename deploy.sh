#!/bin/bash
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source ${dir}/credentials

reset

function _deploy_file() {
    HOST=$1
    SRC=$2
    DEST=$3
    echo Deploying file ${SRC} to ${HOST}:${DEST}
    scp -i ${SSH_KEY} -p ${PORT} ${dir}/${SRC} ${USER}@${HOST}:${DEST}
}

npm run build

files=(
    index.js
    index.js.map
)

for i in "${files[@]}"; do
    _deploy_file ${SERVER} "dist/$i" "~/uniswap-autorouter-api/$i"
done
