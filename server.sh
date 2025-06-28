#!/bin/bash

trap "kill 0" EXIT

python3 -m http.server 1234 -d output &>/dev/null &

find trees | entr -r sh -c './build.sh && qutebrowser --target window ":reload"'

wait
