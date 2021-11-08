#!/bin/bash

# docker build . -t observertc/evaluator-js:latest -f
docker build --no-cache -t observertc/evaluator-js:latest .
docker login
docker push observertc/evaluator-js:latest