#!/bin/bash

./build.sh

fswatch -o trees/ | while read num; do
  echo "Rebuilding forest"
  ./build.sh
  echo "Done"
  sleep .5
done
