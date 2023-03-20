#!/bin/bash
set -e
eval $(ssh-agent -s)
SSH_CMD=$(cat << EOF
  set -x
  set -e
  echo -n "LifeAtAdaface1!" | sudo docker login -u siddug --password-stdin rgstr.adaface.com
  sudo docker pull rgstr.adaface.com/adaface/pythagoras:$1
  sudo docker stop deployment_pythagoras || true
  sudo docker rm deployment_pythagoras || true
  sudo docker run --memory 12000m --env NODE_ENV=production --name deployment_pythagoras -p 2000:2000 -d rgstr.adaface.com/adaface/pythagoras:$1
  sudo docker image prune -a -f
  ls
EOF
)
ssh -i "SG-AWS-KeyPair-Master.pem" ubuntu@ec2-18-221-194-166.us-east-2.compute.amazonaws.com "$SSH_CMD"