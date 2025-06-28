#!/bin/bash

./build.sh

fswatch -o assets/ trees/ | while read num; do
  time ./build.sh
done
