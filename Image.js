var im=require('imagemagick');

var Image=module.exports=function(name,path,options){
	//console.log('new image',name,path);
	this.name=name;
	this.path=path;
	S.extObj(this,options);
	this.id=Image.autoincrement++;
	this.lines=[];
}

Image.options={
	/* https://github.com/andris9/stylus-sprite/blob/master/stylus-sprite.js#L63 */
	keys:{
		'width':{type:'number'},
		'height':{type:'number'},
		'dimensions':{type:'boolean'},
		'align':{type:'predefined', values: ["block","left","center","right"]},
		'valign':{type:'predefined', values: ["block","bottom","middle","top"]},
		'resize':{type:'boolean'},
		'repeat':{type:'predefined', values:['no','x','y']},
		'limit-repeat-x':{type:'number'},
		'limit-repeat-y':{type:'number'}
	},
	defaults:{
		width:0, height:0,
		dimensions:true,
		align:'block',
		valign:'block',
		resize:false,
		repeat:'no',
		'limit-repeat-x':300,
		'limit-repeat-y':0,
	},
	
	validate:function(key,value){
		if(!this.keys[key]) throw new Error("Invalid key '"+key+"'");
		var v=value;
		switch(this.keys[key].type){
			case 'number':
				v = Number(value);
				if(isNaN(value)) throw new Error("Invalid number value '"+value+"' for "+key);
				break;
			case 'predefined':
				if(!S.aHas(this.keys[key].values,value))
					throw new Error("Unknown value '"+value+"' for "+key+", allowed: "+this.keys[key].values);
				break;
			case 'boolean':
				v = value==='false' || value==='0' || !value ? false : true;
				break;
		}
		return v;
	},
	
	parse:function(options){
		var opts=S.oClone(this.defaults);
		if(options)
			options.split(/[,;]+/).forEach(function(opt){
				var parts=opt.split(':',2),
					key=parts[0] && parts.shift().trim().toLowerCase(),
					value=parts.length && parts[0].trim();
				if(!key) return;
				opts[key]=Image.options.validate(key,value);
			});
		return opts;
	},
	hash:function(options){
		var hash=[];
		for(var i in options)
			hash.push([i,options[i]]);
		return S.aSortBy(hash,0).map(function(a){return a[0]+':'+a[1];}).join(';');
	}
}
Image.autoincrement=1;
Image.prototype={
	addLine:function(line){
		this.lines.push(line);
	},
	
	readDimensions:function(cb){
		var t=this;
		im.identify(['-format', '%wx%h',t.path],function(err,dim){
			if(err) return cb(err);
			
			t.dim=dim;
			var dim=dim.trim().split('x');
			
			t.realWidth=Number(dim[0]);
			if(!t.width) t.width=t.realWidth;
			t.realHeight=Number(dim[1]);
			if(!t.height) t.height=t.realHeight;
			
			cb(null);
		});
	},
	
	/* https://github.com/andris9/stylus-sprite/blob/master/stylus-sprite.js#L283 */
	prepare:function(){
		// Calculate block size for the image
		// Use pixel values, or 100% for X axis where needed (repeat:x)
		
		this.blockWidth = (this.repeat==="x" && this['limit-repeat-x'] || "100%")
								|| (this.align!="block" && "100%") || this.width;
		this.blockHeight = (this.repeat=="y" && this['limit-repeat-y']) || this.height;
		
		// Block height can't be lower than image height
		if(this.blockHeight<this.height) this.blockHeight=this.height;
	}
}
