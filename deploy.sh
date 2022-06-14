#!/bin/bash
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source ${dir}/credentials

reset

function _deploy_file() {
    HOST=$1
    SRC=$2
    DEST=$3
    echo Deploying file ${SRC} to ${HOST}:${DEST}
    scp -i ${SSH_KEY} -P ${PORT} ${dir}/${SRC} ${USER}@${HOST}:${DEST}
}

npm run build

_deploy_file ${SERVER} "dist/index.js" "~/uniswap-autorouter-api"
_deploy_file ${SERVER} "dist/index.js.map" "~/uniswap-autorouter-api"
_deploy_file ${SERVER} "dist/abis/Token.json" "~/uniswap-autorouter-api/abis"
