#!/usr/bin/env bash

yarn run build
NODE_ENV=production yarn run start:main
