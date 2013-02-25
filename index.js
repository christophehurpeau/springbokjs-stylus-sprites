require('springboktools');
require('springboktools/UObj');
require('springboktools/UArray');
require('springboktools/UString/UString');
var
	Sprite=require('./Sprite'),
	Image=require('./Image'),
	stylus=require('stylus'),
	nodes=stylus.nodes,
	async=require('async');

var StylusSprites=module.exports=function(options){
	UObj.extend(this,{
		placeholder:'SPRINGBOK_SPRITE_PLACEHOLDER',
		pngcrush:'pngcrush',
		prefix:''
	});
	UObj.extend(this,options);
	if(!this.path) throw new Error('path must be set');
	this.sprites={};
};


StylusSprites.prototype={
	getSprite:function(name){
		var sprite=this.sprites[name];
		if(sprite) return sprite;
		return this.sprites[name]=new Sprite(this,name);
	},
	
	build:function(css,callback){
		var sprites=[];
		for(var k in this.sprites) sprites.push(this.sprites[k]);
		async.reduce(sprites,css,function(css,sprite,callback){
			sprite.build(css,callback);
		},callback);
	},
	
	stylus:function(){
		var t=this;
		return function(name,image,options){
			options=Image.options.parse(options&&options.val);
			if(!name||!name.string) throw new Error('sprite must have a file name');
			if(!name.string.contains('.')) name.string+='.png';
			var sprite=t.getSprite(name.string), image = sprite.image(image.string,options,name.lineno);
			return new nodes.Property(['background'],'url('+name.string+') spritepos('+t.placeholder+'-'+image.id+')');
			/*
			width = item.width;
			height = item.height;
			positionX = item.positionX * -1;
			positionY = item.positionY * -1;
			
			/* if retina
	      width = width / 2
	      height = height / 2
	      positionX = positionX / 2
	      positionY = positionY / 2*/
			/*if(dimensions){
				width = new nodes.Property(["width"], width+"px");
				height = new nodes.Property(["height"], height+"px");
				this.closestBlock.nodes.splice(this.closestBlock.index+1, 0, width, height);
			}*/
			//httpUrl = (options.httpPath||options.path) + sprite.filename();
			
			//return new nodes.Property(["background"], "url('"+httpUrl+"') "+positionX+"px "+positionY+"px");
		};
	},
}