/**
 * @fileoverview
 * 
 * TODO add _ prefix to private properties
 * TODO much cleanup needed
 * TODO no change of property from outside. use getter/setter
 * TODO only chained API
*/

/**
 * widely inspired from MD2Character.js from alteredq / http://alteredqualia.com/
*/
tQuery.register('MD2Character', function(){
	this._scale		= 1;
	this.animationFPS	= 6;

	this._root		= new THREE.Object3D();
	this._meshBody		= null;
	this._meshWeapon	= null;

	this.skinsBody		= [];
	this.skinsWeapon	= [];

	this.weapons		= [];

	this.activeAnimation	= null;
	this._nLoadInProgress	= 0;
});

// make it eventable
tQuery.MicroeventMixin(tQuery.MD2Character.prototype);

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Update the animation
 * 
 * @param {Number} deltaSeconds nb seconds since the last update
*/
tQuery.MD2Character.prototype.update	= function( deltaSeconds )
{
	if ( this._meshBody ) {
		this._meshBody.updateAnimation( 1000 * deltaSeconds );
	}
	if ( this._meshWeapon ) {
		this._meshWeapon.updateAnimation( 1000 * deltaSeconds );
	}
	return this;	// for chained API
};

/**
 * @returns {THREE.Object3D} the object3D containing the object
*/
tQuery.MD2Character.prototype.container	= function(){
	return this._root;
}

tQuery.MD2Character.prototype.isLoaded	= function(){
	return this._nLoadInProgress === 0 ? true : false;
}

tQuery.MD2Character.prototype.scale	= function(value){
	if( value === undefined )	return this._scale;
	this._scale	= value;
	return this;
}


//////////////////////////////////////////////////////////////////////////////////
//		Setter								//
//////////////////////////////////////////////////////////////////////////////////

tQuery.MD2Character.prototype.setWireframe = function ( enable )
{
	// TODO remove the added property on THREE.Mesh
	if( enable ){
		if ( this._meshBody )	this._meshBody.material	= this._meshBody.materialWireframe;
		if ( this._meshWeapon )	this._meshWeapon.material= this._meshWeapon.materialWireframe;
	} else {
		if ( this._meshBody )	this._meshBody.material	= this._meshBody.materialTexture;
		if ( this._meshWeapon )	this._meshWeapon.material= this._meshWeapon.materialTexture;
	}
	return this;	// for chained API
};

tQuery.MD2Character.prototype.setWeapon = function ( index )
{
	// make all weapons invisible
	for ( var i = 0; i < this.weapons.length; i ++ ){
		this.weapons[ i ].visible = false;
	}
	// set the active weapon
	var activeWeapon = this.weapons[ index ];

	if( activeWeapon ){
		activeWeapon.visible	= true;
		this._meshWeapon		= activeWeapon;

		activeWeapon.playAnimation( this.activeAnimation, this.animationFPS );

		this._meshWeapon.baseDuration	= this._meshWeapon.duration;

		this._meshWeapon.time		= this._meshBody.time;
		this._meshWeapon.duration	= this._meshBody.duration;
	}
	return this;	// for chained API
};

tQuery.MD2Character.prototype.setAnimation = function( animationName )
{
	if ( this._meshBody ) {
		this._meshBody.playAnimation( animationName, this.animationFPS );
		this._meshBody.baseDuration	= this._meshBody.duration;
	}
	if ( this._meshWeapon ) {
		this._meshWeapon.playAnimation( animationName, this.animationFPS );
		this._meshWeapon.baseDuration	= this._meshWeapon.duration;
		this._meshWeapon.time		= this._meshBody.time;
	}
	this.activeAnimation = animationName;
	return this;	// for chained API
};

tQuery.MD2Character.prototype.setPlaybackRate	= function( rate )
{
	if ( this._meshBody ){
		this._meshBody.duration = this._meshBody.baseDuration / rate;
	}
	if ( this._meshWeapon ){
		this._meshWeapon.duration = this._meshWeapon.baseDuration / rate;
	}
	return this;	// for chained API
};

tQuery.MD2Character.prototype.setSkin	= function( index )
{
	if ( this._meshBody && this._meshBody.material.wireframe === false ) {
		this._meshBody.material.map	= this.skinsBody[ index ];
	}
	return this;	// for chained API
};

//////////////////////////////////////////////////////////////////////////////////
//		Loader								//
//////////////////////////////////////////////////////////////////////////////////
tQuery.MD2Character.prototype.loadParts		= function ( config )
{
	var _this		= this;
	this._nLoadInProgress	= config.weapons.length * 2 + config.skins.length + 1;

	var weaponsTextures = []
	for ( var i = 0; i < config.weapons.length; i ++ ){
		weaponsTextures[ i ] = config.weapons[ i ][ 1 ];
	}

	// SKINS

	this.skinsBody	= this._loadTextures( config.baseUrl + "skins/", config.skins );
	this.skinsWeapon= this._loadTextures( config.baseUrl + "skins/", weaponsTextures );

	// BODY

	var loader	= new THREE.JSONLoader();

	loader.load( config.baseUrl + config.body, function( geometry ) {
		geometry.computeBoundingBox();
		_this._root.position.y	= - _this._scale * geometry.boundingBox.min.y;

		var mesh	= createPart( geometry, _this.skinsBody[ 0 ] );
		mesh.scale.set( _this._scale, _this._scale, _this._scale );

		_this._root.add( mesh );

		_this._meshBody		= mesh;
		_this.activeAnimation	= geometry.firstAnimation;

		_this._checkLoadingComplete();
	} );

	// WEAPONS

	var generateCallback = function( index, name ){
		return function( geometry ) {
			var mesh	= createPart( geometry, _this.skinsWeapon[ index ] );
			mesh.scale.set( _this._scale, _this._scale, _this._scale );
			mesh.visible	= false;

			mesh.name	= name;

			_this._root.add( mesh );

			_this.weapons[ index ] = mesh;
			_this._meshWeapon = mesh;

			_this._checkLoadingComplete();
		}.bind(this);
	}.bind(this);

	for ( var i = 0; i < config.weapons.length; i ++ ) {
		var url		= config.baseUrl + config.weapons[ i ][ 0 ];
		var callback	= generateCallback( i, config.weapons[ i ][ 0 ] );
		loader.load( url, callback );
	}

	function createPart( geometry, skinMap ) {
		geometry.computeMorphNormals();

		var whiteMap		= THREE.ImageUtils.generateDataTexture( 1, 1, new THREE.Color( 0xffffff ) );
		var materialWireframe	= new THREE.MeshPhongMaterial({
			color		: 0xffaa00,
			specular	: 0x111111,
			shininess	: 50,
			wireframe	: true,
			shading		: THREE.SmoothShading,
			map		: whiteMap,
			morphTargets	: true,
			morphNormals	: true,
			perPixel	: true,
			metal		: false
		});

		var materialTexture	= new THREE.MeshPhongMaterial({
			color		: 0xffffff,
			specular	: 0x111111,
			shininess	: 50,
			wireframe	: false,
			shading		: THREE.SmoothShading,
			map		: skinMap,
			morphTargets	: true,
			morphNormals	: true,
			perPixel	: true,
			metal		: false
		});
		materialTexture.wrapAround = true;

		//

		var mesh	= new THREE.MorphAnimMesh( geometry, materialTexture );
		mesh.rotation.y = -Math.PI/2;

		mesh.castShadow		= true;
		mesh.receiveShadow	= true;

		//

		mesh.materialTexture	= materialTexture;
		mesh.materialWireframe	= materialWireframe;

		//

		mesh.parseAnimations();

		mesh.playAnimation( geometry.firstAnimation, _this.animationFPS );
		mesh.baseDuration	= mesh.duration;

		return mesh;
	};
	return this;	// for chained API
};

tQuery.MD2Character.prototype._checkLoadingComplete	= function()
{
	this._nLoadInProgress--;
	if( this._nLoadInProgress === 0 ){
		this.trigger('loaded');
	}
}

/**
 * Load a texture and return it
*/
tQuery.MD2Character.prototype._loadTextures	= function( baseUrl, textureUrls )
{
	var mapping	= new THREE.UVMapping();
	var textures	= [];
	var callback	= function(){
		this._checkLoadingComplete()
	}.bind(this);
	// load all textureUrls
	for( var i = 0; i < textureUrls.length; i ++ ){
		var url			= baseUrl + textureUrls[ i ];
		var texture		= THREE.ImageUtils.loadTexture( url, mapping, callback);
		textures[ i ]		= texture;
		textures[ i ].name	= textureUrls[ i ];
	}
	// return them
	return textures;
};
