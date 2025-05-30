#! /bin/bash

npm run generate:schema

# Prep the admin service
pushd src/backend/admin
npm run build:prep
popd

#build all the services
docker compose build