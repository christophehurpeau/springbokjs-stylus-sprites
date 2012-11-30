var Image=require('./Image'),
	im=require('imagemagick'),
	fs=require('fs'),
	async=require('async'),
	exec = require("child_process").exec;

var Sprite=module.exports=function(sprites,name){
	this.sprites=sprites;
	this.name=name;
	this.images={}; this.imagesLength=0;
	this.outputFormat=name.split(".").pop().toLowerCase()||'png';
	this.height=0; this.width=0;
	
	if(["png", "jpeg", "jpg", "gif"].indexOf(this.outputFormat)===-1)
		throw new Error("Invalid output format: '"+this.outputFormat+"'");
}

/* https://github.com/andris9/stylus-sprite/blob/master/stylus-sprite.js */

Sprite.prototype={
	
	image:function(imageName,options,line){
		var hash=imageName+Image.options.hash(options),image=this.images[hash];
		if(!image){
			options.hash=hash;
			this.images[hash]=image=new Image(imageName,
					(imageName[0]==='/'?'':this.sprites.path)+imageName,options);
			this.imagesLength++;
		}
		image.addLine(line);
		return image;
	},
	
	build:function(css,callback){
		console.log('building '+this.name);
		var t=this,i=0,hasError=false,internalCallback=function(err){
			i++;
			if(err) hasError=err;
			if(t.imagesLength===i)
				hasError ? callback(hasError) : t.makeMap(css,callback);
		};
		S.oForEach(t.images,function(k,image){
			//console.log("processing "+image.name +" ("+image.id+")...");
			image.readDimensions(function(err){
				if(err){
					if(err.message) err.message+='; line #'+image.lines.join(',');
					return internalCallback(err);
				}
				//console.log('dimensions: '+image.width+'x'+image.height);
				image.prepare();
				
				// Calculate canvas width
				if(S.isNb(image.blockWidth) && image.blockWidth>t.width) t.width=image.blockWidth;
				// Images with 100% block width need canvas width to be at least their image width
				if(image.width>t.width) t.width=image.width;
				
				t.height+=image.blockHeight;
				
				internalCallback();
			});
		});
	},
	
	makeMap:function(css,callback){
		//console.log('makeMap '+this.name);
		var t=this,posX=0,posY=0,commands=['-size',this.width+'x'+this.height,'xc:none'];
		S.oForEach(this.images,function(k,image){
			if(image.blockWidth==='100%') image.blockWidth=t.width;
			/*if(image.width>image.imageWidth)
				posX=Math.round(image.width/2-image.imageWidth/2);
			
			// Vertical align for positioning image in image element
			if(image.height>image.imageHeight){
				if(image.valign==='top') posY = 0;
				else if(image.valign==='bottom') posY=image.height;
			}*/
			posX=0;
			if(image.repeat!=='x'){
				if(image.align==='center') posX = Math.round((t.width-image.width)/2);
				else if(image.align==='right') posX = t.width - image.width;
			}
			
			var imageDim=image.width+'x'+image.height;
			commands.push(image.path);
			if(!image.resize) commands.push('-extract',imageDim);
			commands.push('-geometry',(image.resize?imageDim:'')+'+'+posX+'+'+posY,'-composite');
			
			var startX=posX, startY=posY;
			if(image.repeat==='x'){
				startX=0;
				var curX=image.width;
				while(curX<image.blockWidth){
					commands.push(image.path);
					if(!image.resize) commands.push('-extract',imageDim);
					commands.push('-geometry',(image.resize?imageDim:'')+'+'+curX+'+'+posY,'-composite');
					curX+=image.width;
				}
				posY+=image.height;
			}else if(image.repeat==='y'){
				var curY=image.height;
				while(curY<startY+image.blockHeight){
					var nextCurY=curY+image.height,remainingHeight=image.blockHeight-curY,
							resize=image.height>remainingHeight;
					commands.push(image.path);
					if(!image.resize) commands.push('-extract',resize?image.width+'x'+remainingHeight:imageDim);
					else if(resize) throw new Error('Not yet supported : image.resize and repeat-y with crop');
					commands.push('-geometry',(image.resize?imageDim:'')+'+'+posX+'+'+curY,'-composite');
					curY+=image.height;
				}
				posY+=image.blockHeight;
			}else{
				posY+=image.height;
			}
			var cssPlacementX=image.align==='right'?'100%':(image.align==='center'?'center':'-'+startX),
				cssPlacementY="-"+startY;
			
			var cssReplace=(cssPlacementX==='-0'?'0':cssPlacementX+'px')+" "+(cssPlacementY==='-0'?'0':cssPlacementY+'px')+'$1'
					+(image.dimensions?' width:'+image.width+'; height:'+image.height+';':'');
			
			//console.log('spritepos\\('+t.sprites.placeholder+'\\-'+image.id+'\\)([^;]*;)'+'=>'+cssReplace);
			css=css.replace(new RegExp('spritepos\\('+t.sprites.placeholder+'\\-'+image.id+'\\)([^;]*;)','g'),cssReplace);
		});
		var spritename=this.name,path=t.sprites.outputPath,copySpriteTo=[];
		if(S.isArray(path)){
			copySpriteTo=path;
			path=copySpriteTo.shift();
		}
		
		
		var spritefilename=path+spritename,destfilename=spritefilename;
		if(this.outputFormat==='png') destfilename=destfilename+'_tmp_'+Date.now()+'.png';
		commands.push(destfilename);
		
		var internalCallback=function(err){
			if(err) return callback(err);
			callback(null,css);
		}
		
		//console.log('im: '+commands.join(' '));
		im.convert(commands,function(err){
			//console.log('im: '+(err?'Err : '+err:'no error'));
			if(err) return callback(err);
			if(t.outputFormat==='png'){
				//console.log(t.sprites.pngcrush+' -brute '+destfilename+' '+spritefilename);
				exec(t.sprites.pngcrush+' -brute '+destfilename+' '+spritefilename,function(err,stdout,stderr){
					//console.log('pngcrush: '+(err?'Err : '+err:'no error')+"stdout="+stdout+', stderr='+stderr);
					fs.unlink(destfilename);
					if(copySpriteTo.length){
						async.forEach(copySpriteTo,function(to,callback){
							//console.log('copy '+spritefilename+' to '+to);
							fs.createReadStream(spritefilename)
								.pipe(fs.createWriteStream(to+spritename))
									.on('close',callback);
						},internalCallback);
					}else internalCallback();
				});
			}else internalCallback();
		});
	}
};