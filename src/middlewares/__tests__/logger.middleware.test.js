import {loggerMiddleware} from '../logger.middleware';
import {log} from '../../utils/logging.util';
import startTiming from '../../utils/timing.util';

// mock timing function
jest.mock('../../utils/timing.util');
startTiming.mockImplementation(() => () => 42);

describe('LoggerMiddleware tests', () => {
  const ctxListeners = {
    on: (event, cb) => {
      if (event === 'finish') {
        cb();
      }
    },
    removeListener: () => {}
  };

  it('Should invoke next and make call to log.info', () => {
    log.info = jest.fn();
    // const spy = sandbox.spy(log, 'info');
    const next = jest.fn();
    const ctx = {
      method: 'method',
      baseUrl: 'url',
      header: 'header',
      status: 'status',
      message: 'message',
      ...ctxListeners
    };

    const res = loggerMiddleware(ctx, ctx, next);

    return res.then(() => {
      expect(next).toBeCalled();
      expect(log.info).toMatchSnapshot();
    });
  });

  it('Should invoke next and make call to log.error', () => {
    log.error = jest.fn();
    const next = jest.fn();
    const ctx = {...ctxListeners};
    const res = loggerMiddleware(null, ctx, next);

    return res.then(() => {
      expect(next).toBeCalled();
      expect(log.error).toBeCalled();
      expect(log.error.mock.calls[0]).toMatchSnapshot();
    });
  });
});
