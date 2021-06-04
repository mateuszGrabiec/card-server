const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

async function initialize(passport,getUserByEmail, getUserById){
	const authenticateUser = async (emailAddress,password,done) =>{
		const user = await getUserByEmail(emailAddress);
		if(!user){
			return done(null,false, {message:'NO user with that email'});
		}

		try{
			if(await bcrypt.compare(password,user.password)){
				return done(null, user);
			}else{
				return done(null,false, {message:'Invalid password'});
			}
		}catch(e){
			return done(e);
		}
	};

	passport.use(new LocalStrategy({usernameField:'emailAddress'},authenticateUser));

	passport.serializeUser(async(user, done) => done(null, user.id));
	passport.deserializeUser(async(id, done) => {
		return done(null, await getUserById(id));
	});

}

module.exports = initialize;