
def execute_sql(sql, values=None):
    try:
        connection=connection_pool.get_connection()
        if connection.is_connected():
            cursor=connection.cursor()
            if values:
                cursor.execute(sql, values)
            else:
                cursor.execute(sql)
            result=cursor.fetchall()
            return result
    except:
        result="error"
    finally:
        if connection:
            cursor.close()
            connection.close()