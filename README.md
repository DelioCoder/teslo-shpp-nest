<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Teslo API
1. Clonar proyecto
2. ```npm install```
3. Clonar el archivo ```.env.template``` y renombrarlo a ```.env```
4. Cambiar las variables de entorno
5. Levantar la base de datos
.Levantar la base de datos
```
docker-compose up -d
```
6. Ejecutar SEED
```
localhost:3000/api/seed
```
7. Levantar: ```npm run start:dev```

## Auth

packages:

- @nestjs/jwt
- @nestjs/passport
- bcrypt | @types/bcrypt
- passport
- passport-jwt | @types/passport-jwt