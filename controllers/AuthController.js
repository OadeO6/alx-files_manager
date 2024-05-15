import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export function getConnect(req, res){
  let authToken = req.headers["authorization"];
  if (!authToken){
    res.status(401).json({ "error": "Unauthorized"});
  }
  if (!authToken.startsWith("Basic ")){
    res.status(401).json({ "error": "Unauthorized"});
  }
  try {
    authToken = atob(authToken.trim().split(' ', 2)[1]);
  } catch (err){
    res.status(401).json({ "error": "Unauthorized"});
  }
  let [ email, pwd ] = authToken.split(":", 2);
  if (!email || !pwd){
    res.status(401).json({ "error": "Unauthorized"});
  }
  pwd =  createHash('sha1').update(pwd).digest('hex');
  dbClient.findUser({"email": email, "password": pwd})
    .then((user)=>{
      if (!user){
        res.status(401).json({ "error": "Unauthorized"});
      }
      const Token = uuidv4();
      const key = `auth_${Token}`;
      redisClient.set(key, user[0]._id, 86400)
        .then(()=>{
          res.status(200).json({"token": Token});
        }).catch((err)=>{
          res.status(401).json({ "error": "Unauthorized"});
        });
    }).catch((err)=>{
      res.status(401).json({ "error": "Unauthorized"});
    });
}

export function getDisconnect(req, res){
  const sessionToken = req.headers["x-token"];
  if (!sessionToken){
        res.status(401).json({ "error": "Unauthorized"});
  }
  const key = `auth_${sessionToken}`;
  redisClient.get(`auth_${sessionToken}`)
    .then((email) => {
      if (!email){
        res.status(401).json({ "error": "Unauthorized"});
      }
      dbClient.findUser({"email": email})
        .then((user)=>{
          if (!user){
            res.status(401).json({ "error": "Unauthorized"});
          }
          redisClient.del(`auth_${sessionToken}`)
            .then((count)=>{
              res.status(204).end();
            });
        }).catch(()=>{
            res.status(401).json({ "error": "Unauthorized"});
        });
    });
}

export function getMe(req, res){
  const sessionToken = req.headers["x-token"];
  if (!sessionToken){
        res.status(401).json({ "error": "Unauthorized"});
  }
  const key = `auth_${sessionToken}`;
  redisClient.get(`auth_${sessionToken}`)
    .then((_id) => {
      if (!_id){
        res.status(401).json({ "error": "Unauthorized"});
      }
      dbClient.findUser({"_id": _id})
        .then((user)=>{
          if (!user){
            res.status(401).json({ "error": "Unauthorized"});
          }
          if (user.length !> 0){
            res.status(401).json({ "error": "Unauthorized"});
          }
          res.status(200).json({"id": user[0]._id, "email": user[0].email});
        }).catch(()=>{
            res.end();
        });
    }).catch((err) => {
      res.status(401).json({ "error": "Unauthorized"});
    });
}
