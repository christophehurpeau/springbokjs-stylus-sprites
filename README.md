exemple :

main.styl

.icon,.icon32{display:inline-block;width:16px;height:16px;margin:2px 3px 2px 0;@extend .hiddenText;font-size:0;}

icon16($name,iconName=$name)
	.icon.{$name}
		sicons16(iconName)

sicons16(fileIconName)
	sprite i16 '../images/'+fileIconName+'.png' 'dimensions:false'