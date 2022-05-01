

var fs = require('fs');


//Читаем настройки (данный файл создается скриптом ./setup_domain.sh)
//"url_path": "https://$domain/nft/" - URL-путь по которому будут зранится NFT
//"file_path": "/home/ubuntu/www/$domain/nft/" - Путь в файловой системе где будут хранится NFT
//"seller_fee_basis_points": 100 -  комиссия создателя при перепродаже
//
var config = JSON.parse(fs.readFileSync("./config.json"));
exports.config = config;



//Работа с изоборажениями
const { createCanvas, loadImage } = require("canvas");


/*
Шансы выпадения:
Обычные: 57.5%
Редкие: 31.25%
Легендарные: 10%
Эпические: 1.25%
*/
const modChances = [0.575, 0.3125, 0.1, 0.0125];
exports.modChances = modChances;

//Названия фракций
const fractionNames = ["Сommittee", "Picnic", "Church", "Phalanx", "Fops"];
exports.fractionNames = fractionNames;


//Названия классов
const classNames =  ["Recon", "Ranger", "Supporter", "Defender", "Assaulter"];
exports.classNames = classNames;


//Названия модификаторов
const modNames = ["", "Rare ", "Legendary ", "Epic "];
exports.modNames = modNames;


//Генерирует случайное число от 0 до max-1
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
};
exports.getRandomInt = getRandomInt;

//Проверка существования файла
exports.fileExists = fileExists;

function fileExists(path) {
  var fs = require('fs');
  try  {
    return fs.statSync(path).isFile();
  }
  catch (e) {
    return false;
  }
};



//Путь на сервере к NFT-metadata
function pathMetadata(gen_id, fname){
  return config["file_path"] + gen_id + "/" + fname + ".json"
}
exports.pathMetadata = pathMetadata;

//Путь к исзображению на сервере
function pathImage(gen_id, fname){
  return config["file_path"] + gen_id + "/" + fname + ".png"
}
exports.pathImage = pathImage;

//URL на сервере к NFT-metadata
function urlMetadata(gen_id, fname){
  return config["url_path"] + gen_id + "/" + fname + ".json"
};
exports.urlMetadata = urlMetadata;

//URL на сервере к изображению NFT
function urlImage(gen_id, fname){
  return config["url_path"] + gen_id + "/" + fname + ".png"
};
exports.urlImage = urlImage;



//Ф-я для демонстрации. Генерация изображения NFT-лутбокаса, в зависимости от mod -  разный фон
function genNFTLootboxImage(mod, nft_hash, image_filename){
  var  canvas = createCanvas(400, 400);
  
  //Фон для лутбокса
  var Canvas = require('canvas');
  var bgimg = new Canvas.Image;
  //Подгружаем шаблон с фоном изображения 
  bgimg.src = fs.readFileSync("./game_related/img_tmpls/lootbox_" + mod + ".png");
  var ctx = canvas.getContext("2d");
  //Рисуем фон
  ctx.drawImage(bgimg, 0, 0, bgimg.width, bgimg.height);
  //Пишем поверх фона надпись с названием
  ctx.fillStyle = "black";
  ctx.font = "24px serif";
  ctx.fillText(nft_hash["name"], 20, 40);
  //Сохраняем изображение
  fs.writeFileSync(
    image_filename,
    canvas.toBuffer("image/png")
  );

}


//Создание лутбокса
exports.generateLootboxJSON = generateLootboxJSON;

function generateLootboxJSON(
  creator_pub_key,
  gen_id,//id-генерации (уникальное значение, временная метка или можно брать из связанно записи в БД)
  fname,//Имя файла (без расширения)
  //Модификатор: 0 - обычный, 1 - редкий, 2 - легендарный, 3 - эпический
  mod,
  //Комиссия создателя, 100 = 1%
  seller_fee_basis_points
){


  var nft_name = modNames[mod];
  if(nft_name != ""){
    nft_name = nft_name + " ";
  };
  nft_name = nft_name + "Lootbox"
  //Заполняем свойства NFT-токена
  var nft_hash = {
    //Имя токена = модификатор + "Lootbox"
    "name": nft_name,
    "symbol": "",
    //Описание токена
    "description": nft_name,
    //Комиссия которую получает создатель токена (игра), при вторичных продажах
    //Royalty basis points that goes to creators in secondary sales (0-10000).
    "seller_fee_basis_points": seller_fee_basis_points,
    //Изображение токена
    "image": urlImage(gen_id, fname),
    //Харкатеристики (заполняем ниже)
    "attributes": [
      {
        "trait_type": "Type",
        "value": "Lootbox",
      },
      {
        //Модификатор
        "trait_type": "Mod",
        "value": modNames[mod]
      }
    ],
    //Информация о создателе токена (кошелек игры)
    "properties": {
      "creators": [
        {
          "address": creator_pub_key,
          "share": 100
        }
      ]
    }
  };

  //Сохраняем в файл JSON с информацией об агенте
  var fs = require('fs');
  //Создаем директорию (если нет)
  fs.mkdirSync(require('path').dirname(pathMetadata(gen_id, fname)));
  //Записываем файл 
  fs.writeFileSync(pathMetadata(gen_id, fname), JSON.stringify(nft_hash), 'utf8');

  //Для примера Генерируем изображение с изображением NFT,
  //можно закомментировать если изображение уже есть по указанному пути
  genNFTLootboxImage(mod, nft_hash, pathImage(gen_id, fname));



  //log.info(nft_hash);
  return nft_hash;

};

