from web import app


@app.route('/')
def home():
    return "Hello World!"


@app.route('/version')
def version():
    import subprocess
    label = subprocess.check_output(["C:/Git/bin/git.exe", "describe", "--always" ])
    return label