#!/bin/bash
# export DOCKER_HOST=tcp://localhost:2375
echo -n "LifeAtAdaface1!" | sudo docker login -u siddug --password-stdin rgstr.adaface.com
sudo docker pull rgstr.adaface.com/adaface/pythagoras:latest || true
# sudo docker build --platform linux/amd64 --pull --build-arg NODE_ENV=production --cache-from rgstr.adaface.com/adaface/pythagoras:latest --tag rgstr.adaface.com/adaface/pythagoras:$1 .
sudo docker build --platform linux/amd64 --pull --build-arg NODE_ENV=production --tag rgstr.adaface.com/adaface/pythagoras:$1 .
sudo docker push rgstr.adaface.com/adaface/pythagoras:$1
sudo docker tag rgstr.adaface.com/adaface/pythagoras:$1 rgstr.adaface.com/adaface/pythagoras:latest
sudo docker push rgstr.adaface.com/adaface/pythagoras:latest
