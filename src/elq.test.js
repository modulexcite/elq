describe('elq', function () {

  it('should be an object', function () {
    expect(elq).to.be.an('object');
  });

  describe('.register()', function () {

    it('should be a function', function () {
      expect(elq.register).to.be.a('function');
    });

    it('should register an element query and return a class', function () {
      expect(
        elq.register('a', 'min-width: 100px')
      ).to.equal('elq-min-width-100px');
      elq.unregister();
    });

    it('should allow custom element queries to be registered', function () {
      expect(
        elq.register('a', 'min-width: 100px', 'tiny')
      ).to.equal('tiny');
      elq.respond();
      elq.unregister();
      expect(document.querySelectorAll('.tiny')).to.have.length(3);
      document.getElementsByTagName('a')[0].className = '';
      document.getElementsByTagName('a')[1].className = '';
      document.getElementsByTagName('a')[2].className = '';
    });

  });

  describe('.unregister()', function () {

    it('should be a function', function () {
      expect(elq.register).to.be.a('function');
    });

  });

  describe('.process()', function () {

    it('should be a function', function () {
      expect(elq.process).to.be.a('function');
    });

    it('should process all the css of a page', function (done) {
        var
          l = document.createElement('link'),
          s = document.createElement('style'),
          out1 = 'a.elq-min-width-100px { color: red; }\n',
          out2 = 'p.elq-width-100px { color: blue; }\n';

        l.setAttribute('href', 'external1.css');
        document.head.appendChild(l);

        s.innerHTML = 'p:media(width: 100px) { color: blue; }';
        document.head.appendChild(s);

        elq.process();
        window.setTimeout(function () {
          expect(
            document.getElementsByTagName('style')[1].innerHTML
          ).to.equal(out1);
          expect(
            document.getElementsByTagName('style')[2].innerHTML
          ).to.equal(out2);
          elq._private.removeFetchedLink(l);
          elq.unregister();
          document.head.removeChild(l);
          document.head.removeChild(s);
          document.head.removeChild(
            document.getElementsByTagName('style')[0]
          );
          done();
        }, 500);
    });

  });

  describe('.respond()', function () {

    it('should be a function', function () {
      expect(elq.respond).to.be.a('function');
    });

    it('should return true if selectors are registered', function (done) {
      var
        l = document.createElement('link');

      l.setAttribute('href', 'external3.css');
      document.head.appendChild(l);

      expect(elq.respond()).to.equal(false);
      elq._private.fetchLink(l);
      window.setTimeout(function () {
        elq._private.expandElementQueries();
        expect(elq.respond()).to.equal(true);
        elq._private.removeFetchedLink(l);
        document.head.removeChild(l);
        done();
      }, 500);

    });

    it('should set initial styles', function (done) {
      var
        l = document.createElement('link');

      l.setAttribute('href', 'external3.css');
      document.head.appendChild(l);

      elq._private.fetchLink(l);
      window.setTimeout(function () {
        elq._private.expandElementQueries();
        elq.respond();
        expect(
          getComputedStyle(document.getElementsByTagName('a')[0]).color
        ).to.equal('rgb(255, 0, 0)');
        expect(
          getComputedStyle(document.getElementsByTagName('a')[1]).color
        ).to.equal('rgb(0, 255, 0)');
        expect(
          getComputedStyle(document.getElementsByTagName('a')[2]).color
        ).to.equal('rgb(0, 0, 255)');
        elq._private.removeFetchedLink(l);
        document.head.removeChild(l);
        done();
      }, 500);

    });

    it('should set responded styles', function (done) {
      var
        l = document.createElement('link');

      l.setAttribute('href', 'external3.css');
      document.head.appendChild(l);

      elq._private.fetchLink(l);
      window.setTimeout(function () {
        elq._private.expandElementQueries();
        elq.respond();
        expect(
          getComputedStyle(document.getElementsByTagName('a')[0]).color
        ).to.equal('rgb(255, 0, 0)');
        expect(
          getComputedStyle(document.getElementsByTagName('a')[1]).color
        ).to.equal('rgb(0, 255, 0)');
        expect(
          getComputedStyle(document.getElementsByTagName('a')[2]).color
        ).to.equal('rgb(0, 0, 255)');
        document.getElementById('container').className = 'w800px';
        elq.respond();
        expect(
          getComputedStyle(document.getElementsByTagName('a')[0]).color
        ).to.equal('rgb(0, 255, 0)');
        expect(
          getComputedStyle(document.getElementsByTagName('a')[1]).color
        ).to.equal('rgb(0, 0, 255)');
        expect(
          getComputedStyle(document.getElementsByTagName('a')[2]).color
        ).to.equal('rgb(0, 0, 255)');
        document.getElementById('container').className = 'w400px';
        elq._private.removeFetchedLink(l);
        document.getElementsByTagName('a')[0].className = '';
        document.getElementsByTagName('a')[1].className = '';
        document.getElementsByTagName('a')[2].className = '';
        document.head.removeChild(l);
        done();
      }, 500);

    });

  });

  describe('.delay()', function () {

    it('should be a function', function () {
      expect(elq.delay).to.be.a('function');
    });

  });

  describe('_private', function () {

    it('should be an object', function () {
      expect(elq._private).to.be.an('object');
    });

    describe('.fetchLink()', function () {

      it('should be a function', function () {
        expect(elq._private.fetchLink).to.be.a('function');
      });

      it('should return true for the first fetch', function () {
        var
          l = document.createElement('link');

        l.setAttribute('href', 'external1.css');
        document.head.appendChild(l);

        expect(elq._private.fetchLink(l)).to.equal(true);
        expect(elq._private.fetchLink(l)).to.equal(false);
        elq._private.removeFetchedLink(l);

        document.head.removeChild(l);
      });

      it('should add a new style on the first fetch', function () {
        var
          l = document.createElement('link');

        l.setAttribute('href', 'external1.css');
        document.head.appendChild(l);

        expect(document.getElementsByTagName('style')).to.have.length(0);
        elq._private.fetchLink(l);
        expect(document.getElementsByTagName('style')).to.have.length(1);
        elq._private.fetchLink(l);
        expect(document.getElementsByTagName('style')).to.have.length(1);
        elq._private.removeFetchedLink(l);
        expect(document.getElementsByTagName('style')).to.have.length(0);

        document.head.removeChild(l);
      });

      it('should process multiple external files', function () {
        var
          l1 = document.createElement('link'),
          l2 = document.createElement('link');

        l1.setAttribute('href', 'external1.css');
        l2.setAttribute('href', 'external2.css');
        document.head.appendChild(l1);
        document.head.appendChild(l2);

        expect(document.getElementsByTagName('style')).to.have.length(0);
        elq._private.fetchLink(l1);
        expect(document.getElementsByTagName('style')).to.have.length(1);
        elq._private.fetchLink(l2);
        expect(document.getElementsByTagName('style')).to.have.length(2);
        elq._private.fetchLink(l1);
        expect(document.getElementsByTagName('style')).to.have.length(2);
        elq._private.fetchLink(l2);
        expect(document.getElementsByTagName('style')).to.have.length(2);
        elq._private.removeFetchedLink(l1);
        expect(document.getElementsByTagName('style')).to.have.length(1);
        elq._private.removeFetchedLink(l2);
        expect(document.getElementsByTagName('style')).to.have.length(0);

        document.head.removeChild(l1);
        document.head.removeChild(l2);
      });

    });

    describe('.removeFetchedLink()', function () {

      it('should be a function', function () {
        expect(elq._private.removeFetchedLink).to.be.a('function');
      });

      it('should return true if an associated style is found', function () {
        var
          l = document.createElement('link');

        l.setAttribute('href', 'external1.css');
        document.head.appendChild(l);

        elq._private.fetchLink(l);
        expect(elq._private.removeFetchedLink(l)).to.equal(true);
        expect(elq._private.removeFetchedLink(l)).to.equal(false);

        document.head.removeChild(l);
      });

      it('should only remove associated style elements', function () {
        var
          l = document.createElement('link'),
          s = document.createElement('style'),
          ls;

        l.setAttribute('href', 'external1.css');
        document.head.appendChild(l);
        document.head.appendChild(s);

        elq._private.removeFetchedLink(l);
        expect(s.parentNode).to.equal(document.head);
        elq._private.fetchLink(l);
        ls = l.nextSibling;
        expect(s).to.not.equal(ls);
        expect(ls.parentNode).to.equal(document.head);
        expect(s.parentNode).to.equal(document.head);
        elq._private.removeFetchedLink(l);
        expect(ls.parentNode).to.equal(null);
        expect(s.parentNode).to.equal(document.head);

        document.head.removeChild(l);
        document.head.removeChild(s);
      });

      it('should only remove cache so styles may be re-added', function () {
        var
          l = document.createElement('link'),
          ls;

        l.setAttribute('href', 'external1.css');
        document.head.appendChild(l);

        elq._private.fetchLink(l);
        ls = l.nextSibling;
        expect(ls.parentNode).to.equal(document.head);
        elq._private.removeFetchedLink(l);
        expect(ls.parentNode).to.equal(null);
        elq._private.fetchLink(l);
        ls = l.nextSibling;
        expect(ls.parentNode).to.equal(document.head);
        elq._private.removeFetchedLink(l);
        expect(ls.parentNode).to.equal(null);

        document.head.removeChild(l);
      });

    });

    describe('.respondToContext()', function () {

      it('should be a function', function () {
        expect(elq._private.respondToContext).to.be.a('function');
      });

    });

    describe('.expandElementQueries()', function () {

      it('should be a function', function () {
        expect(elq._private.expandElementQueries).to.be.a('function');
      });

      it('should return true if a valid element query exists', function () {
        var
          s = document.createElement('style');

        s.innerHTML = 'a:media(min-width: 100px){ color: red; }';

        expect(elq._private.expandElementQueries()).to.equal(false);
        document.head.appendChild(s);
        expect(elq._private.expandElementQueries()).to.equal(true);
        document.head.removeChild(s);
      });

    });

    describe('.mediaToCondition()', function () {

      it('should be a function', function () {
        expect(elq._private.mediaToCondition).to.be.a('function');
      });

      it('should surround everything with parentheses', function () {
        var
          in1  = 'a',
          out1 = '(a)';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
      });

      it('should reduce unnecessary parentheses', function () {
        var
          in1  = '((a))',
          out1 = '(a)',
          in2  = '((((a))))',
          out2 = '(a)',
          in3  = '(a)',
          out3 = '(a)';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

      it('should replace commas with ||', function () {
        var
          in1  = 'a, b',
          out1 = '(a)||(b)',
          in2  = 'a, b, c',
          out2 = '(a)||(b)||(c)';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
      });

      it('should replace nots with !', function () {
        var
          in1  = 'not a',
          out1 = '(!(a))',
          in2  = 'not a, b',
          out2 = '(!(a))||(b)',
          in3  = 'a, not b, not c',
          out3 = '(a)||(!(b))||(!(c))';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

      it('should replace ands with &&', function () {
        var
          in1  = 'a and b',
          out1 = '(a&&b)',
          in2  = 'a and b and c',
          out2 = '(a&&b&&c)';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
      });

      it('should replace min-width statements', function () {
        var
          in1  = 'min-width: 16px',
          out1 = '(contextWidth>=16)',
          in2  = 'min-width: 1em',
          out2 = '((contextWidth/empx)>=1)',
          in3  = 'min-width: 1rem',
          out3 = '((contextWidth/rempx)>=1)';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

      it('should replace max-width statements', function () {
        var
          in1  = 'max-width: 16px',
          out1 = '(contextWidth<=16)',
          in2  = 'max-width: 1em',
          out2 = '((contextWidth/empx)<=1)',
          in3  = 'max-width: 1rem',
          out3 = '((contextWidth/rempx)<=1)';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

      it('should replace width statements', function () {
        var
          in1  = 'width: 16px',
          out1 = '(contextWidth==16)',
          in2  = 'width: 1em',
          out2 = '((contextWidth/empx)==1)',
          in3  = 'width: 1rem',
          out3 = '((contextWidth/rempx)==1)';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

      it('should replace min-height statements', function () {
        var
          in1  = 'min-height: 16px',
          out1 = '(contextHeight>=16)',
          in2  = 'min-height: 1em',
          out2 = '((contextHeight/empx)>=1)',
          in3  = 'min-height: 1rem',
          out3 = '((contextHeight/rempx)>=1)';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

      it('should replace max-height statements', function () {
        var
          in1  = 'max-height: 16px',
          out1 = '(contextHeight<=16)',
          in2  = 'max-height: 1em',
          out2 = '((contextHeight/empx)<=1)',
          in3  = 'max-height: 1rem',
          out3 = '((contextHeight/rempx)<=1)';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

      it('should replace height statements', function () {
        var
          in1  = 'height: 16px',
          out1 = '(contextHeight==16)',
          in2  = 'height: 1em',
          out2 = '((contextHeight/empx)==1)',
          in3  = 'height: 1rem',
          out3 = '((contextHeight/rempx)==1)';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

      it('should replace min-aspect-ratio statements', function () {
        var
          in1  = 'min-aspect-ratio: 1/5',
          out1 = '((contextWidth/contextHeight)>=(1/5))',
          in2  = 'min-aspect-ratio: 16/19',
          out2 = '((contextWidth/contextHeight)>=(16/19))',
          in3  = 'min-aspect-ratio: 1/3',
          out3 = '((contextWidth/contextHeight)>=(1/3))';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

      it('should replace max-aspect-ratio statements', function () {
        var
          in1  = 'max-aspect-ratio: 1/5',
          out1 = '((contextWidth/contextHeight)<=(1/5))',
          in2  = 'max-aspect-ratio: 16/19',
          out2 = '((contextWidth/contextHeight)<=(16/19))',
          in3  = 'max-aspect-ratio: 1/3',
          out3 = '((contextWidth/contextHeight)<=(1/3))';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

      it('should replace aspect-ratio statements', function () {
        var
          in1  = 'aspect-ratio: 1/5',
          out1 = '((contextWidth/contextHeight)==(1/5))',
          in2  = 'aspect-ratio: 16/19',
          out2 = '((contextWidth/contextHeight)==(16/19))',
          in3  = 'aspect-ratio: 1/3',
          out3 = '((contextWidth/contextHeight)==(1/3))';

        expect(elq._private.mediaToCondition(in1)).to.equal(out1);
        expect(elq._private.mediaToCondition(in2)).to.equal(out2);
        expect(elq._private.mediaToCondition(in3)).to.equal(out3);
      });

    });

  });

});
