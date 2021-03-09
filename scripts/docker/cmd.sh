
if [ "$NODE_ENV" = "production" ]; then
  yarn run build
  yarn run start:main
else
  yarn run watch
fi
