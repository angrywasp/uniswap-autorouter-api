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

function _deploy_directory() {
    HOST=$1
    SRC=$2
    DEST=$3
    echo Deploying directory ${SRC} to ${HOST}:${DEST}
    scp -i ${SSH_KEY} -P ${PORT} -r ${dir}/${SRC} ${USER}@${HOST}:${DEST}
}

npm run build

#ssh -i ${SSH_KEY} -p ${PORT} ${USER}@${HOST} 'screen -XS autorouter-api quit'

_deploy_file ${SERVER} "dist/index.js" "~/autorouter-api/index.js"
_deploy_file ${SERVER} "dist/index.js.map" "~/autorouter-api/index.js.map"
_deploy_directory ${SERVER} "dist/abis" "~/autorouter-api"
_deploy_directory ${SERVER} "dist/lib" "~/autorouter-api"

#ssh -i ${SSH_KEY} -p ${PORT} ${USER}@${HOST} 'screen -Smd autorouter-api node ~/autorouter-api/.'
